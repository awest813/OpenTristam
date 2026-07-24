import {
  createMultiplayerDiagnostics,
  describeTransportError,
  mapRejectionReason,
} from './multiplayerDiagnostics';
import { write_packet, client_packet, server_packet, RejectionReason } from './packet';

describe('multiplayerDiagnostics', () => {
  it('maps rejection reasons into stable categories', () => {
    expect(mapRejectionReason(RejectionReason.JOIN_VERSION_MISMATCH)).toEqual({
      category: 'version_mismatch',
      message: 'Version mismatch. Host and guest must use the same app version.',
    });
  });

  it('maps unknown rejection reasons without exposing reason codes', () => {
    const mapped = mapRejectionReason(9999);
    expect(mapped.category).toBe('unknown');
    expect(mapped.message).not.toMatch(/reason code/i);
    expect(mapped.message).toMatch(/join/i);
  });

  it('maps raw transport errors to friendly copy', () => {
    expect(describeTransportError(new Error('PeerJS join failed'))).toMatch(/multiplayer service/i);
    expect(describeTransportError(new Error('Connection timeout'))).toMatch(/timed out/i);
    expect(describeTransportError(new Error('packet too large'))).toMatch(
      /unexpected multiplayer data/i
    );
    expect(describeTransportError(new Error('boom'))).toMatch(/couldn’t connect/i);
  });

  it('tracks connect flow from join request to acceptance', () => {
    const diagnostics = createMultiplayerDiagnostics();

    diagnostics.observeOutboundPacket(
      write_packet(client_packet.join_game, {
        cookie: 1,
        name: 'my-session',
        password: '',
      })
    );
    expect(diagnostics.getStatus().status).toBe('connecting');
    expect(diagnostics.getStatus().sessionId).toBe('my-session');

    diagnostics.observeInboundPacket(
      write_packet(server_packet.join_accept, {
        cookie: 1,
        index: 0,
        seed: 123,
        difficulty: 0,
      })
    );
    expect(diagnostics.getStatus().status).toBe('connected');
    expect(diagnostics.getStatus().message).toContain('my-session');
  });

  it('classifies join rejection by reason', () => {
    const diagnostics = createMultiplayerDiagnostics();

    diagnostics.observeOutboundPacket(
      write_packet(client_packet.join_game, {
        cookie: 1,
        name: 'my-session',
        password: '',
      })
    );
    diagnostics.observeInboundPacket(
      write_packet(server_packet.join_reject, {
        cookie: 1,
        reason: RejectionReason.JOIN_GAME_FULL,
      })
    );

    const status = diagnostics.getStatus();
    expect(status.status).toBe('failed');
    expect(status.category).toBe('game_full');
    expect(status.message).toMatch(/full/i);
  });

  it('caps event list by maxEvents', () => {
    const diagnostics = createMultiplayerDiagnostics({ maxEvents: 3 });

    diagnostics.recordAppAction('evt-1');
    diagnostics.recordAppAction('evt-2');
    diagnostics.recordAppAction('evt-3');
    diagnostics.recordAppAction('evt-4');

    const events = diagnostics.getEvents();
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('evt-2');
    expect(events[2].type).toBe('evt-4');
  });

  it('marks malformed packet sequences as protocol mismatch', () => {
    const diagnostics = createMultiplayerDiagnostics();

    diagnostics.observeInboundPacket(
      write_packet(server_packet.join_accept, {
        cookie: 1,
        index: 0,
        seed: 99,
        difficulty: 0,
      })
    );

    const events = diagnostics.getEvents();
    const anomaly = events.find((entry) => entry.type === 'handshake_anomaly');
    expect(anomaly).toBeTruthy();
    expect(anomaly.category).toBe('protocol_mismatch');
    expect(anomaly.message).not.toMatch(/out of sequence/i);
  });

  it('categorizes transport timeout errors with friendly messaging', () => {
    const diagnostics = createMultiplayerDiagnostics();
    diagnostics.observeTransportError(new Error('Connection timeout while opening peer'));
    expect(diagnostics.getStatus().category).toBe('timeout');
    expect(diagnostics.getStatus().status).toBe('failed');
    expect(diagnostics.getStatus().message).toMatch(/timed out/i);
    expect(diagnostics.getStatus().message).not.toMatch(/opening peer/i);
  });

  it('increments retryCount on retry/reconnect and resets on connected', () => {
    const diagnostics = createMultiplayerDiagnostics();

    expect(diagnostics.getStatus().retryCount).toBe(0);

    diagnostics.recordAppAction('retry_requested');
    expect(diagnostics.getStatus().retryCount).toBe(1);
    expect(diagnostics.getStatus().message).toMatch(/reconnecting/i);

    diagnostics.recordAppAction('reconnect_requested');
    expect(diagnostics.getStatus().retryCount).toBe(2);

    diagnostics.observeInboundPacket(
      write_packet(server_packet.join_accept, {
        cookie: 1,
        index: 0,
        seed: 42,
        difficulty: 0,
      })
    );
    expect(diagnostics.getStatus().status).toBe('connected');
    expect(diagnostics.getStatus().retryCount).toBe(0);
  });
});
