import {
  buffer_reader,
  read_packet,
  client_packet,
  server_packet,
  RejectionReason,
} from './packet';

const DEFAULT_STATUS = 'idle';
const DEFAULT_CATEGORY = null;
const DEFAULT_MESSAGE = '';
const noop = () => {};

const rejectionReasonMap = {
  [RejectionReason.JOIN_ALREADY_IN_GAME]: {
    category: 'already_in_game',
    message: 'You’re already in a multiplayer game.',
  },
  [RejectionReason.JOIN_GAME_NOT_FOUND]: {
    category: 'game_not_found',
    message: 'No game found with that session ID. Check the ID and try again.',
  },
  [RejectionReason.JOIN_INCORRECT_PASSWORD]: {
    category: 'incorrect_password',
    message: 'Incorrect password. Try again.',
  },
  [RejectionReason.JOIN_VERSION_MISMATCH]: {
    category: 'version_mismatch',
    message: 'Version mismatch. Host and guest must use the same app version.',
  },
  [RejectionReason.JOIN_GAME_FULL]: {
    category: 'game_full',
    message: 'That game is full. Try another session.',
  },
  [RejectionReason.CREATE_GAME_EXISTS]: {
    category: 'game_exists',
    message: 'A game with this session ID already exists. Choose a different ID.',
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
  return (
    rejectionReasonMap[reason] || {
      category: 'unknown',
      message: 'Couldn’t join that game. Ask the host for a new invite and try again.',
    }
  );
}

/**
 * Map raw transport/library errors to short player-facing copy.
 * Full detail stays in diagnostics event logs.
 *
 * @param {unknown} errorLike
 * @returns {string}
 */
export function describeTransportError(errorLike) {
  const raw = (errorLike && errorLike.message) || String(errorLike || '');
  const lower = raw.toLowerCase();
  if (!raw || lower === 'transport error' || lower === 'error') {
    return 'Couldn’t connect. Check your network and try again.';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Connection timed out. Try again in a moment.';
  }
  if (lower.includes('version')) {
    return 'Version mismatch. Host and guest must use the same app version.';
  }
  if (lower.includes('packet too large') || lower.includes('parse')) {
    return 'Received unexpected multiplayer data. Try reconnecting.';
  }
  if (lower.includes('peerjs') || lower.includes('websocket')) {
    return 'Couldn’t reach the multiplayer service. Check your connection and try again.';
  }
  return 'Couldn’t connect. Check your network and try again.';
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
  let retryCount = 0;

  const snapshot = () => ({
    status,
    category,
    message,
    sessionId,
    shareUrl,
    handshakeState,
    retryCount,
  });

  function setStatus(nextStatus, nextCategory, nextMessage) {
    const hasChanged =
      status !== nextStatus || category !== nextCategory || message !== nextMessage;
    if (nextStatus === 'connected' || nextStatus === 'idle') {
      retryCount = 0;
    }
    status = nextStatus;
    category = nextCategory;
    message = nextMessage;
    if (hasChanged) {
      onStatusChange(snapshot());
    }
  }

  function record({
    source,
    type,
    nextStatus = status,
    nextCategory = category,
    nextMessage = message,
    details = {},
  }) {
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
    const details = { direction, packetType: decoded.type.code };
    record({ source: 'protocol', type: 'packet', details });
  }

  function observeOutboundPacket(data) {
    try {
      const packets = toPacketList(data, client_packet);
      packets.forEach((decoded) => {
        recordProtocolPacket('outbound', decoded);
        switch (decoded.type.code) {
          case client_packet.info.code:
            clientVersion = decoded.packet.version;
            record({
              source: 'protocol',
              type: 'client_info',
              details: { version: clientVersion },
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
              nextMessage: `Hosting “${sessionId}”…`,
              details: { sessionId },
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
              nextMessage: `Joining “${sessionId}”…`,
              details: { sessionId },
            });
            break;
          case client_packet.leave_game.code:
            handshakeState = 'idle';
            record({
              source: 'protocol',
              type: 'leave_game',
              nextStatus: 'idle',
              nextCategory: null,
              nextMessage: 'Left the game.',
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
        nextMessage: 'Couldn’t send multiplayer data. Try reconnecting.',
        details: { error: String(error) },
      });
    }
  }

  function observeInboundPacket(data) {
    try {
      const packets = toPacketList(data, server_packet);
      packets.forEach((decoded) => {
        recordProtocolPacket('inbound', decoded);
        switch (decoded.type.code) {
          case server_packet.info.code:
            if (clientVersion != null && decoded.packet.version !== clientVersion) {
              record({
                source: 'protocol',
                type: 'server_info_mismatch',
                nextStatus: 'failed',
                nextCategory: 'version_mismatch',
                nextMessage: 'Version mismatch. Host and guest must use the same app version.',
                details: { clientVersion, serverVersion: decoded.packet.version },
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
                nextMessage:
                  'Connected, but the handshake was out of order. Try reconnecting if play feels stuck.',
                details: { handshakeState },
              });
            } else {
              record({
                source: 'protocol',
                type: 'join_accept',
                nextStatus: 'connected',
                nextCategory: null,
                nextMessage: sessionId ? `Connected to “${sessionId}”.` : 'Connected.',
                details: { index: decoded.packet.index },
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
              details: { reason: decoded.packet.reason },
            });
            break;
          }
          case server_packet.connect.code:
            record({
              source: 'protocol',
              type: 'peer_connected',
              nextStatus: 'connected',
              nextCategory: null,
              nextMessage: sessionId ? `Connected to “${sessionId}”.` : 'Connected.',
              details: { id: decoded.packet.id },
            });
            break;
          case server_packet.disconnect.code:
            record({
              source: 'protocol',
              type: 'peer_disconnected',
              nextStatus: 'retrying',
              nextCategory: 'disconnected',
              nextMessage: 'Connection dropped. Reconnecting…',
              details: { id: decoded.packet.id, reason: decoded.packet.reason },
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
        nextMessage: 'Received unexpected multiplayer data. Try reconnecting.',
        details: { error: String(error) },
      });
    }
  }

  function observeTransportLifecycle(event = {}) {
    const { type = 'unknown' } = event;
    switch (type) {
      case 'opening':
      case 'connect_attempt':
        record({
          source: 'transport',
          type,
          nextStatus: 'connecting',
          nextCategory: null,
          nextMessage: 'Connecting…',
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
          nextMessage: sessionId ? `Connected to “${sessionId}”.` : 'Connected.',
          details: event,
        });
        break;
      case 'retrying':
        record({
          source: 'transport',
          type,
          nextStatus: 'retrying',
          nextCategory: 'transport_retry',
          nextMessage: 'Reconnecting…',
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
          nextMessage: 'Connection closed. Reconnecting…',
          details: event,
        });
        break;
      case 'error':
        record({
          source: 'transport',
          type,
          nextStatus: 'failed',
          nextCategory: event.category || 'transport_error',
          nextMessage: event.message || 'Couldn’t connect. Check your network and try again.',
          details: event,
        });
        break;
      default:
        record({ source: 'transport', type, details: event });
    }
  }

  function observeTransportError(errorLike, details = {}) {
    const nextCategory = inferErrorCategory(errorLike);
    record({
      source: 'transport',
      type: 'error',
      nextStatus: 'failed',
      nextCategory,
      nextMessage: describeTransportError(errorLike),
      details: {
        ...details,
        error: String(errorLike),
      },
    });
  }

  function recordAppAction(type, details = {}) {
    if (type === 'retry_requested' || type === 'reconnect_requested') {
      retryCount += 1;
      handshakeState = 'awaiting_join_result';
      record({
        source: 'app',
        type,
        nextStatus: 'retrying',
        nextCategory: 'manual_retry',
        nextMessage: 'Reconnecting…',
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
    record({ source: 'app', type, details });
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
