import { createMultiplayerDiagnostics, mapRejectionReason } from './multiplayerDiagnostics';
import { write_packet, client_packet, server_packet, RejectionReason } from './packet';

describe('multiplayerDiagnostics', () => {
  it('maps rejection reasons into stable categories', () => {
    expect(mapRejectionReason(RejectionReason.JOIN_VERSION_MISMATCH)).toEqual({
      category: 'version_mismatch',
      message: 'Version mismatch. Host and joiner must use compatible builds.',
    });
  });

  it('tracks connect flow from join request to acceptance', () => {
    const diagnostics = createMultiplayerDiagnostics();

    diagnostics.observeOutboundPacket(write_packet(client_packet.join_game, {
      cookie: 1,
      name: 'my-session',
      password: '',
    }));
    expect(diagnostics.getStatus().status).toBe('connecting');
    expect(diagnostics.getStatus().sessionId).toBe('my-session');

    diagnostics.observeInboundPacket(write_packet(server_packet.join_accept, {
      cookie: 1,
      index: 0,
      seed: 123,
      difficulty: 0,
    }));
    expect(diagnostics.getStatus().status).toBe('connected');
    expect(diagnostics.getStatus().message).toContain('my-session');
  });

  it('classifies join rejection by reason', () => {
    const diagnostics = createMultiplayerDiagnostics();

    diagnostics.observeOutboundPacket(write_packet(client_packet.join_game, {
      cookie: 1,
      name: 'my-session',
      password: '',
    }));
    diagnostics.observeInboundPacket(write_packet(server_packet.join_reject, {
      cookie: 1,
      reason: RejectionReason.JOIN_GAME_FULL,
    }));

    const status = diagnostics.getStatus();
    expect(status.status).toBe('failed');
    expect(status.category).toBe('game_full');
  });

  it('caps event list by maxEvents', () => {
    const diagnostics = createMultiplayerDiagnostics({maxEvents: 3});

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

    diagnostics.observeInboundPacket(write_packet(server_packet.join_accept, {
      cookie: 1,
      index: 0,
      seed: 99,
      difficulty: 0,
    }));

    const events = diagnostics.getEvents();
    const anomaly = events.find(entry => entry.type === 'handshake_anomaly');
    expect(anomaly).toBeTruthy();
    expect(anomaly.category).toBe('protocol_mismatch');
  });

  it('categorizes transport timeout errors', () => {
    const diagnostics = createMultiplayerDiagnostics();
    diagnostics.observeTransportError(new Error('Connection timeout while opening peer'));
    expect(diagnostics.getStatus().category).toBe('timeout');
    expect(diagnostics.getStatus().status).toBe('failed');
  });
});
