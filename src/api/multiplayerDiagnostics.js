import { buffer_reader, read_packet, client_packet, server_packet, RejectionReason } from './packet';

const DEFAULT_STATUS = 'idle';
const DEFAULT_CATEGORY = null;
const DEFAULT_MESSAGE = '';
const noop = () => {};

const rejectionReasonMap = {
  [RejectionReason.JOIN_ALREADY_IN_GAME]: {
    category: 'already_in_game',
    message: 'You are already in a multiplayer game.',
  },
  [RejectionReason.JOIN_GAME_NOT_FOUND]: {
    category: 'game_not_found',
    message: 'Game not found. Verify the session ID and try again.',
  },
  [RejectionReason.JOIN_INCORRECT_PASSWORD]: {
    category: 'incorrect_password',
    message: 'Incorrect password. Try again with the correct password.',
  },
  [RejectionReason.JOIN_VERSION_MISMATCH]: {
    category: 'version_mismatch',
    message: 'Version mismatch. Host and joiner must use compatible builds.',
  },
  [RejectionReason.JOIN_GAME_FULL]: {
    category: 'game_full',
    message: 'Game is full. Try another session.',
  },
  [RejectionReason.CREATE_GAME_EXISTS]: {
    category: 'game_exists',
    message: 'A game with this session ID already exists.',
  },
};

function toPacketList(data, packetTypes) {
  const payload = data instanceof Uint8Array ? data : new Uint8Array(data);
  const reader = new buffer_reader(payload);
  const decoded = read_packet(reader, packetTypes);
  if (!reader.done()) {
    throw Error('packet too large');
  }
  if (decoded.type.code === packetTypes.batch.code) {
    return decoded.packet;
  }
  return [decoded];
}

function inferErrorCategory(errorLike) {
  const message = (errorLike && errorLike.message) || String(errorLike || '');
  const lower = message.toLowerCase();
  if (lower.includes('timeout')) {
    return 'timeout';
  }
  if (lower.includes('version')) {
    return 'version_mismatch';
  }
  return 'transport_error';
}

function buildShareUrl(sessionId) {
  if (!sessionId) {
    return null;
  }
  if (typeof window === 'undefined' || !window.location) {
    return `session:${sessionId}`;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('session', sessionId);
  return url.toString();
}

export function mapRejectionReason(reason) {
  return rejectionReasonMap[reason] || {
    category: 'unknown',
    message: `Join request rejected (reason code: ${reason}).`,
  };
}

export function createMultiplayerDiagnostics(options = {}) {
  const {
    maxEvents = 200,
    now = () => Date.now(),
    onEvent = noop,
    onStatusChange = noop,
  } = options;

  let events = [];
  let status = DEFAULT_STATUS;
  let category = DEFAULT_CATEGORY;
  let message = DEFAULT_MESSAGE;
  let sessionId = null;
  let shareUrl = null;
  let handshakeState = 'idle';
  let clientVersion = null;

  const snapshot = () => ({
    status,
    category,
    message,
    sessionId,
    shareUrl,
    handshakeState,
  });

  function setStatus(nextStatus, nextCategory, nextMessage) {
    const hasChanged = status !== nextStatus || category !== nextCategory || message !== nextMessage;
    status = nextStatus;
    category = nextCategory;
    message = nextMessage;
    if (hasChanged) {
      onStatusChange(snapshot());
    }
  }

  function record({source, type, nextStatus = status, nextCategory = category, nextMessage = message, details = {}}) {
    const entry = {
      timestamp: now(),
      source,
      type,
      status: nextStatus,
      category: nextCategory,
      message: nextMessage,
      details,
    };
    events.push(entry);
    if (events.length > maxEvents) {
      events = events.slice(events.length - maxEvents);
    }
    onEvent(entry);
    setStatus(nextStatus, nextCategory, nextMessage);
    return entry;
  }

  function recordProtocolPacket(direction, decoded) {
    const details = {direction, packetType: decoded.type.code};
    record({source: 'protocol', type: 'packet', details});
  }

  function observeOutboundPacket(data) {
    try {
      const packets = toPacketList(data, client_packet);
      packets.forEach(decoded => {
        recordProtocolPacket('outbound', decoded);
        switch (decoded.type.code) {
        case client_packet.info.code:
          clientVersion = decoded.packet.version;
          record({
            source: 'protocol',
            type: 'client_info',
            details: {version: clientVersion},
          });
          break;
        case client_packet.create_game.code:
          sessionId = decoded.packet.name;
          shareUrl = buildShareUrl(sessionId);
          handshakeState = 'awaiting_join_result';
          record({
            source: 'protocol',
            type: 'create_game',
            nextStatus: 'connecting',
            nextCategory: null,
            nextMessage: `Hosting session "${sessionId}"...`,
            details: {sessionId},
          });
          break;
        case client_packet.join_game.code:
          sessionId = decoded.packet.name;
          shareUrl = buildShareUrl(sessionId);
          handshakeState = 'awaiting_join_result';
          record({
            source: 'protocol',
            type: 'join_game',
            nextStatus: 'connecting',
            nextCategory: null,
            nextMessage: `Joining session "${sessionId}"...`,
            details: {sessionId},
          });
          break;
        case client_packet.leave_game.code:
          handshakeState = 'idle';
          record({
            source: 'protocol',
            type: 'leave_game',
            nextStatus: 'idle',
            nextCategory: null,
            nextMessage: 'Disconnected.',
          });
          break;
        default:
        }
      });
    } catch (error) {
      record({
        source: 'protocol',
        type: 'outbound_decode_error',
        nextStatus: 'failed',
        nextCategory: 'protocol_mismatch',
        nextMessage: 'Failed to parse outbound multiplayer packet.',
        details: {error: String(error)},
      });
    }
  }

  function observeInboundPacket(data) {
    try {
      const packets = toPacketList(data, server_packet);
      packets.forEach(decoded => {
        recordProtocolPacket('inbound', decoded);
        switch (decoded.type.code) {
        case server_packet.info.code:
          if (clientVersion != null && decoded.packet.version !== clientVersion) {
            record({
              source: 'protocol',
              type: 'server_info_mismatch',
              nextStatus: 'failed',
              nextCategory: 'version_mismatch',
              nextMessage: 'Version mismatch detected during handshake.',
              details: {clientVersion, serverVersion: decoded.packet.version},
            });
          }
          break;
        case server_packet.join_accept.code:
          if (handshakeState !== 'awaiting_join_result') {
            record({
              source: 'protocol',
              type: 'handshake_anomaly',
              nextStatus: 'connected',
              nextCategory: 'protocol_mismatch',
              nextMessage: 'Connected, but handshake arrived out of sequence.',
              details: {handshakeState},
            });
          } else {
            record({
              source: 'protocol',
              type: 'join_accept',
              nextStatus: 'connected',
              nextCategory: null,
              nextMessage: sessionId ? `Connected to "${sessionId}".` : 'Connected.',
              details: {index: decoded.packet.index},
            });
          }
          handshakeState = 'connected';
          break;
        case server_packet.join_reject.code: {
          const rejection = mapRejectionReason(decoded.packet.reason);
          handshakeState = 'failed';
          record({
            source: 'protocol',
            type: 'join_reject',
            nextStatus: 'failed',
            nextCategory: rejection.category,
            nextMessage: rejection.message,
            details: {reason: decoded.packet.reason},
          });
          break;
        }
        case server_packet.connect.code:
          record({
            source: 'protocol',
            type: 'peer_connected',
            nextStatus: 'connected',
            nextCategory: null,
            nextMessage: sessionId ? `Connected to "${sessionId}".` : 'Connected.',
            details: {id: decoded.packet.id},
          });
          break;
        case server_packet.disconnect.code:
          record({
            source: 'protocol',
            type: 'peer_disconnected',
            nextStatus: 'retrying',
            nextCategory: 'disconnected',
            nextMessage: 'Connection dropped. Retrying...',
            details: {id: decoded.packet.id, reason: decoded.packet.reason},
          });
          handshakeState = 'awaiting_join_result';
          break;
        default:
        }
      });
    } catch (error) {
      record({
        source: 'protocol',
        type: 'inbound_decode_error',
        nextStatus: 'failed',
        nextCategory: 'protocol_mismatch',
        nextMessage: 'Failed to parse inbound multiplayer packet.',
        details: {error: String(error)},
      });
    }
  }

  function observeTransportLifecycle(event = {}) {
    const {type = 'unknown'} = event;
    switch (type) {
    case 'opening':
    case 'connect_attempt':
      record({
        source: 'transport',
        type,
        nextStatus: 'connecting',
        nextCategory: null,
        nextMessage: 'Connecting...',
        details: event,
      });
      break;
    case 'open':
    case 'connected':
      record({
        source: 'transport',
        type,
        nextStatus: 'connected',
        nextCategory: null,
        nextMessage: sessionId ? `Connected to "${sessionId}".` : 'Connected.',
        details: event,
      });
      break;
    case 'retrying':
      record({
        source: 'transport',
        type,
        nextStatus: 'retrying',
        nextCategory: 'transport_retry',
        nextMessage: 'Retrying multiplayer connection...',
        details: event,
      });
      break;
    case 'closed':
    case 'disconnected':
      record({
        source: 'transport',
        type,
        nextStatus: 'retrying',
        nextCategory: 'disconnected',
        nextMessage: 'Connection closed. Retrying...',
        details: event,
      });
      break;
    case 'error':
      record({
        source: 'transport',
        type,
        nextStatus: 'failed',
        nextCategory: event.category || 'transport_error',
        nextMessage: event.message || 'Multiplayer connection failed.',
        details: event,
      });
      break;
    default:
      record({source: 'transport', type, details: event});
    }
  }

  function observeTransportError(errorLike, details = {}) {
    const nextCategory = inferErrorCategory(errorLike);
    record({
      source: 'transport',
      type: 'error',
      nextStatus: 'failed',
      nextCategory,
      nextMessage: (errorLike && errorLike.message) || String(errorLike || 'Transport error'),
      details: {
        ...details,
        error: String(errorLike),
      },
    });
  }

  function recordAppAction(type, details = {}) {
    if (type === 'retry_requested' || type === 'reconnect_requested') {
      handshakeState = 'awaiting_join_result';
      record({
        source: 'app',
        type,
        nextStatus: 'retrying',
        nextCategory: 'manual_retry',
        nextMessage: 'Retry requested...',
        details,
      });
      return;
    }
    if (type === 'dismissed') {
      record({
        source: 'app',
        type,
        nextStatus: 'idle',
        nextCategory: null,
        nextMessage: '',
        details,
      });
      return;
    }
    record({source: 'app', type, details});
  }

  return {
    mapRejectionReason,
    observeOutboundPacket,
    observeInboundPacket,
    observeTransportLifecycle,
    observeTransportError,
    recordAppAction,
    getEvents() {
      return events.slice();
    },
    getStatus() {
      return snapshot();
    },
  };
}
