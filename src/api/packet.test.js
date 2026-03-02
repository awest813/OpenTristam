import {
  buffer_reader,
  buffer_writer,
  read_packet,
  write_packet,
  packet_size,
  make_batch,
  server_packet,
  client_packet,
} from './packet';

describe('buffer_reader', () => {
  it('initializes correctly with an ArrayBuffer', () => {
    const buffer = new ArrayBuffer(10);
    const reader = new buffer_reader(buffer);
    expect(reader.buffer).toBeInstanceOf(Uint8Array);
    expect(reader.buffer.byteLength).toBe(10);
    expect(reader.pos).toBe(0);
  });

  it('initializes correctly with a Uint8Array', () => {
    const buffer = new Uint8Array(10);
    const reader = new buffer_reader(buffer);
    expect(reader.buffer).toBe(buffer);
    expect(reader.buffer.byteLength).toBe(10);
    expect(reader.pos).toBe(0);
  });

  it('done() returns true when position is at byteLength', () => {
    const buffer = new Uint8Array(1);
    const reader = new buffer_reader(buffer);
    expect(reader.done()).toBe(false);
    reader.pos = 1;
    expect(reader.done()).toBe(true);
  });

  describe('read8', () => {
    it('reads a byte and advances position', () => {
      const buffer = new Uint8Array([0x42, 0x13]);
      const reader = new buffer_reader(buffer);
      expect(reader.read8()).toBe(0x42);
      expect(reader.pos).toBe(1);
      expect(reader.read8()).toBe(0x13);
      expect(reader.pos).toBe(2);
    });

    it('throws error if buffer is too small', () => {
      const reader = new buffer_reader(new Uint8Array(0));
      expect(() => reader.read8()).toThrow('packet too small');
    });
  });

  describe('read16', () => {
    it('reads a 16-bit integer (little-endian) and advances position', () => {
      const buffer = new Uint8Array([0x12, 0x34]);
      const reader = new buffer_reader(buffer);
      expect(reader.read16()).toBe(0x3412);
      expect(reader.pos).toBe(2);
    });

    it('throws error if buffer is too small', () => {
      const reader = new buffer_reader(new Uint8Array(1));
      expect(() => reader.read16()).toThrow('packet too small');
    });
  });

  describe('read32', () => {
    it('reads a 32-bit integer (little-endian) and advances position', () => {
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const reader = new buffer_reader(buffer);
      expect(reader.read32()).toBe(0x78563412);
      expect(reader.pos).toBe(4);
    });

    it('throws error if buffer is too small', () => {
      const reader = new buffer_reader(new Uint8Array(3));
      expect(() => reader.read32()).toThrow('packet too small');
    });
  });

  describe('read_str', () => {
    it('reads a length-prefixed string and advances position', () => {
      // 5 bytes string "hello"
      const buffer = new Uint8Array([5, 104, 101, 108, 108, 111]);
      const reader = new buffer_reader(buffer);
      expect(reader.read_str()).toBe('hello');
      expect(reader.pos).toBe(6);
    });

    it('throws error if length byte is missing', () => {
      const reader = new buffer_reader(new Uint8Array(0));
      expect(() => reader.read_str()).toThrow('packet too small');
    });

    it('throws error if string data is incomplete', () => {
      const buffer = new Uint8Array([5, 104, 101, 108]); // Length 5, but only 3 bytes of data
      const reader = new buffer_reader(buffer);
      expect(() => reader.read_str()).toThrow('packet too small');
    });
  });

  describe('read_buf', () => {
    it('reads a size-prefixed buffer and advances position', () => {
      // 4 bytes length (little-endian for 3), followed by 3 bytes of data
      const buffer = new Uint8Array([3, 0, 0, 0, 10, 20, 30]);
      const reader = new buffer_reader(buffer);
      const result = reader.read_buf();
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(3);
      expect(result[0]).toBe(10);
      expect(result[1]).toBe(20);
      expect(result[2]).toBe(30);
      expect(reader.pos).toBe(7);
    });

    it('throws error if size header is incomplete', () => {
      const reader = new buffer_reader(new Uint8Array([3, 0, 0])); // Only 3 bytes for size
      expect(() => reader.read_buf()).toThrow('packet too small');
    });

    it('throws error when declared size exceeds remaining bytes', () => {
      // Header says 5 bytes but only 2 follow
      const buffer = new Uint8Array([5, 0, 0, 0, 10, 20]);
      const reader = new buffer_reader(buffer);
      expect(() => reader.read_buf()).toThrow('packet too small');
    });
  });
});

describe('buffer_writer', () => {
  it('write8 / read8 round-trip', () => {
    const writer = new buffer_writer(2);
    writer.write8(0xAB).write8(0xCD);
    const reader = new buffer_reader(writer.result);
    expect(reader.read8()).toBe(0xAB);
    expect(reader.read8()).toBe(0xCD);
    expect(reader.done()).toBe(true);
  });

  it('write16 / read16 round-trip (little-endian)', () => {
    const writer = new buffer_writer(2);
    writer.write16(0x1234);
    const reader = new buffer_reader(writer.result);
    expect(reader.read16()).toBe(0x1234);
    expect(reader.done()).toBe(true);
  });

  it('write32 / read32 round-trip (little-endian)', () => {
    const writer = new buffer_writer(4);
    writer.write32(0xDEADBEEF);
    const reader = new buffer_reader(writer.result);
    expect(reader.read32()).toBe(0xDEADBEEF | 0);
    expect(reader.done()).toBe(true);
  });

  it('write_str / read_str round-trip', () => {
    const str = 'hello';
    const writer = new buffer_writer(1 + str.length);
    writer.write_str(str);
    const reader = new buffer_reader(writer.result);
    expect(reader.read_str()).toBe(str);
    expect(reader.done()).toBe(true);
  });

  it('write_buf / read_buf round-trip', () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const writer = new buffer_writer(4 + payload.byteLength);
    writer.write_buf(payload);
    const reader = new buffer_reader(writer.result);
    const result = reader.read_buf();
    expect(result).toEqual(payload);
    expect(reader.done()).toBe(true);
  });
});

describe('server_packet round-trips', () => {
  function roundTrip(types, type, packet) {
    const buf = write_packet(type, packet);
    const reader = new buffer_reader(buf);
    const { type: gotType, packet: gotPacket } = read_packet(reader, types);
    expect(reader.done()).toBe(true);
    return { gotType, gotPacket };
  }

  it('info', () => {
    const { gotType, gotPacket } = roundTrip(server_packet, server_packet.info, { version: 42 });
    expect(gotType).toBe(server_packet.info);
    expect(gotPacket.version).toBe(42);
  });

  it('join_accept', () => {
    const orig = { cookie: 0xCAFE, index: 2, seed: 0x12345678, difficulty: 1 };
    const { gotType, gotPacket } = roundTrip(server_packet, server_packet.join_accept, orig);
    expect(gotType).toBe(server_packet.join_accept);
    expect(gotPacket).toEqual(orig);
  });

  it('join_reject', () => {
    const orig = { cookie: 0xBEEF, reason: 3 };
    const { gotType, gotPacket } = roundTrip(server_packet, server_packet.join_reject, orig);
    expect(gotType).toBe(server_packet.join_reject);
    expect(gotPacket).toEqual(orig);
  });

  it('connect', () => {
    const { gotType, gotPacket } = roundTrip(server_packet, server_packet.connect, { id: 3 });
    expect(gotType).toBe(server_packet.connect);
    expect(gotPacket.id).toBe(3);
  });

  it('disconnect', () => {
    const orig = { id: 1, reason: 0x40000006 };
    const { gotType, gotPacket } = roundTrip(server_packet, server_packet.disconnect, orig);
    expect(gotType).toBe(server_packet.disconnect);
    expect(gotPacket.id).toBe(orig.id);
    expect(gotPacket.reason).toBe(orig.reason | 0);
  });

  it('message with payload', () => {
    const payload = new Uint8Array([10, 20, 30]);
    const orig = { id: 2, payload };
    const { gotType, gotPacket } = roundTrip(server_packet, server_packet.message, orig);
    expect(gotType).toBe(server_packet.message);
    expect(gotPacket.id).toBe(2);
    expect(gotPacket.payload).toEqual(payload);
  });

  it('turn', () => {
    const orig = { id: 0, turn: 9999 };
    const { gotType, gotPacket } = roundTrip(server_packet, server_packet.turn, orig);
    expect(gotType).toBe(server_packet.turn);
    expect(gotPacket).toEqual(orig);
  });

  it('game_list', () => {
    const games = [
      { type: 1, name: 'hell' },
      { type: 2, name: 'norm' },
    ];
    const { gotType, gotPacket } = roundTrip(server_packet, server_packet.game_list, { games });
    expect(gotType).toBe(server_packet.game_list);
    expect(gotPacket.games).toEqual(games);
  });
});

describe('client_packet round-trips', () => {
  function roundTrip(types, type, packet) {
    const buf = write_packet(type, packet);
    const reader = new buffer_reader(buf);
    const { type: gotType, packet: gotPacket } = read_packet(reader, types);
    expect(reader.done()).toBe(true);
    return { gotType, gotPacket };
  }

  it('info', () => {
    const { gotType, gotPacket } = roundTrip(client_packet, client_packet.info, { version: 1 });
    expect(gotType).toBe(client_packet.info);
    expect(gotPacket.version).toBe(1);
  });

  it('game_list (zero-payload)', () => {
    const { gotType } = roundTrip(client_packet, client_packet.game_list, {});
    expect(gotType).toBe(client_packet.game_list);
  });

  it('create_game', () => {
    const orig = { cookie: 0x1234, name: 'MyGame', password: 'pw', difficulty: 2 };
    const { gotType, gotPacket } = roundTrip(client_packet, client_packet.create_game, orig);
    expect(gotType).toBe(client_packet.create_game);
    expect(gotPacket).toEqual(orig);
  });

  it('join_game', () => {
    const orig = { cookie: 0xABCD, name: 'room', password: 'secret' };
    const { gotType, gotPacket } = roundTrip(client_packet, client_packet.join_game, orig);
    expect(gotType).toBe(client_packet.join_game);
    expect(gotPacket).toEqual(orig);
  });

  it('leave_game (zero-payload)', () => {
    const { gotType } = roundTrip(client_packet, client_packet.leave_game, {});
    expect(gotType).toBe(client_packet.leave_game);
  });

  it('drop_player', () => {
    const orig = { id: 2, reason: 0x40000006 };
    const { gotType, gotPacket } = roundTrip(client_packet, client_packet.drop_player, orig);
    expect(gotType).toBe(client_packet.drop_player);
    expect(gotPacket.id).toBe(orig.id);
    expect(gotPacket.reason).toBe(orig.reason | 0);
  });

  it('message', () => {
    const payload = new Uint8Array([0xFF, 0x00]);
    const orig = { id: 0xFF, payload };
    const { gotType, gotPacket } = roundTrip(client_packet, client_packet.message, orig);
    expect(gotType).toBe(client_packet.message);
    expect(gotPacket.id).toBe(0xFF);
    expect(gotPacket.payload).toEqual(payload);
  });

  it('turn', () => {
    const orig = { turn: 12345 };
    const { gotType, gotPacket } = roundTrip(client_packet, client_packet.turn, orig);
    expect(gotType).toBe(client_packet.turn);
    expect(gotPacket).toEqual(orig);
  });
});

describe('batch round-trips', () => {
  it('server_packet.batch encodes and decodes multiple server packets', () => {
    const packets = [
      { type: server_packet.connect, packet: { id: 1 } },
      { type: server_packet.turn, packet: { id: 0, turn: 42 } },
    ];
    const buf = write_packet(server_packet.batch, packets);
    const reader = new buffer_reader(buf);
    const { type: gotType, packet: gotPackets } = read_packet(reader, server_packet);
    expect(reader.done()).toBe(true);
    expect(gotType).toBe(server_packet.batch);
    expect(gotPackets).toHaveLength(2);
    expect(gotPackets[0].type).toBe(server_packet.connect);
    expect(gotPackets[0].packet.id).toBe(1);
    expect(gotPackets[1].type).toBe(server_packet.turn);
    expect(gotPackets[1].packet.turn).toBe(42);
  });

  it('client_packet.batch encodes and decodes multiple client packets (regression: was using server_packet types)', () => {
    const packets = [
      { type: client_packet.turn, packet: { turn: 7 } },
      { type: client_packet.drop_player, packet: { id: 3, reason: 6 } },
    ];
    const buf = write_packet(client_packet.batch, packets);
    const reader = new buffer_reader(buf);
    const { type: gotType, packet: gotPackets } = read_packet(reader, client_packet);
    expect(reader.done()).toBe(true);
    expect(gotType).toBe(client_packet.batch);
    expect(gotPackets).toHaveLength(2);
    expect(gotPackets[0].type).toBe(client_packet.turn);
    expect(gotPackets[0].packet.turn).toBe(7);
    expect(gotPackets[1].type).toBe(client_packet.drop_player);
    expect(gotPackets[1].packet.id).toBe(3);
  });

  it('packet_size returns correct byte count', () => {
    expect(packet_size(server_packet.connect, { id: 0 })).toBe(1 + 1);
    expect(packet_size(server_packet.join_accept, {})).toBe(1 + 13);
  });
});
