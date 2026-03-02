import { createTransport } from './index';

jest.mock('./peerjsTransport', () => ({
  createPeerJsTransport: jest.fn(() => ({send: jest.fn(), dispose: jest.fn()})),
}));

jest.mock('./websocketTransport', () => ({
  createWebSocketTransport: jest.fn(() => ({send: jest.fn(), dispose: jest.fn()})),
}));

import { createPeerJsTransport } from './peerjsTransport';
import { createWebSocketTransport } from './websocketTransport';

describe('createTransport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to peerjs transport', () => {
    const onPacket = jest.fn();
    createTransport({}, onPacket);

    expect(createPeerJsTransport).toHaveBeenCalledWith(onPacket);
    expect(createWebSocketTransport).not.toHaveBeenCalled();
  });

  it('creates websocket transport when requested', () => {
    const onPacket = jest.fn();
    createTransport({kind: 'websocket', websocketUrl: 'wss://example.test'}, onPacket);

    expect(createWebSocketTransport).toHaveBeenCalledWith({url: 'wss://example.test'}, onPacket);
  });

  it('throws when websocket kind is requested without websocketUrl', () => {
    expect(() => createTransport({kind: 'websocket'}, jest.fn())).toThrow('websocketUrl is required when kind is websocket');
  });
});
