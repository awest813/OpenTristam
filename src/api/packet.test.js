import {
  buffer_reader,
  buffer_writer,
  read_packet,
  write_packet,
  packet_size,
  make_batch,
  server_packet,
  client_packet
} from './packet';

describe('buffer_writer', () => {
  it('initializes correctly with length', () => {
    const writer = new buffer_writer(10);
    expect(writer.buffer).toBeInstanceOf(Uint8Array);
    expect(writer.buffer.byteLength).toBe(10);
    expect(writer.pos).toBe(0);
  });

  it('result returns the underlying ArrayBuffer', () => {
    const writer = new buffer_writer(5);
    expect(writer.result).toBeInstanceOf(ArrayBuffer);
    expect(writer.result.byteLength).toBe(5);
  });

  describe('write8', () => {
    it('writes an 8-bit integer and advances position', () => {
      const writer = new buffer_writer(2);
      expect(writer.write8(0x42)).toBe(writer);
      expect(writer.pos).toBe(1);
      expect(writer.buffer[0]).toBe(0x42);
      writer.write8(0x13);
      expect(writer.pos).toBe(2);
      expect(writer.buffer[1]).toBe(0x13);
    });
  });

  describe('write16', () => {
    it('writes a 16-bit integer (little-endian) and advances position', () => {
      const writer = new buffer_writer(2);
      expect(writer.write16(0x3412)).toBe(writer);
      expect(writer.pos).toBe(2);
      expect(writer.buffer[0]).toBe(0x12);
      expect(writer.buffer[1]).toBe(0x34);
    });
  });

  describe('write32', () => {
    it('writes a 32-bit integer (little-endian) and advances position', () => {
      const writer = new buffer_writer(4);
      expect(writer.write32(0x78563412)).toBe(writer);
      expect(writer.pos).toBe(4);
      expect(writer.buffer[0]).toBe(0x12);
      expect(writer.buffer[1]).toBe(0x34);
      expect(writer.buffer[2]).toBe(0x56);
      expect(writer.buffer[3]).toBe(0x78);
    });
  });

  describe('write_str', () => {
    it('writes length-prefixed string and advances position', () => {
      const writer = new buffer_writer(6);
      expect(writer.write_str('hello')).toBe(writer);
      expect(writer.pos).toBe(6);
      expect(writer.buffer[0]).toBe(5); // length
      expect(writer.buffer[1]).toBe(104); // h
      expect(writer.buffer[2]).toBe(101); // e
      expect(writer.buffer[3]).toBe(108); // l
      expect(writer.buffer[4]).toBe(108); // l
      expect(writer.buffer[5]).toBe(111); // o
    });
  });

  describe('rest', () => {
    it('writes raw Uint8Array and advances position', () => {
      const writer = new buffer_writer(4);
      const data = new Uint8Array([10, 20, 30]);
      expect(writer.rest(data)).toBe(writer);
      expect(writer.pos).toBe(3);
      expect(writer.buffer[0]).toBe(10);
      expect(writer.buffer[1]).toBe(20);
      expect(writer.buffer[2]).toBe(30);
    });
  });

  describe('write_buf', () => {
    it('writes size-prefixed Uint8Array and advances position', () => {
      const writer = new buffer_writer(7);
      const data = new Uint8Array([10, 20, 30]);
      expect(writer.write_buf(data)).toBe(writer);
      expect(writer.pos).toBe(7);
      // 4 bytes size (little-endian for 3)
      expect(writer.buffer[0]).toBe(3);
      expect(writer.buffer[1]).toBe(0);
      expect(writer.buffer[2]).toBe(0);
      expect(writer.buffer[3]).toBe(0);
      // Data
      expect(writer.buffer[4]).toBe(10);
      expect(writer.buffer[5]).toBe(20);
      expect(writer.buffer[6]).toBe(30);
    });
  });
});

describe('packet_size', () => {
  it('returns constant size + 1 (for code)', () => {
    const mockType = { size: 4 };
    expect(packet_size(mockType, {})).toBe(5);
  });

  it('returns function evaluated size + 1 (for code)', () => {
    const mockType = { size: (packet) => packet.payload.length };
    expect(packet_size(mockType, { payload: [1, 2, 3] })).toBe(4);
  });
});

describe('write_packet / read_packet', () => {
  const mockTypes = {
    test_const_size: {
      code: 0x42,
      size: 4,
      write: (writer, { val }) => writer.write32(val),
      read: reader => ({ val: reader.read32() }),
    },
    test_dynamic_size: {
      code: 0x43,
      size: ({ text }) => 1 + text.length,
      write: (writer, { text }) => writer.write_str(text),
      read: reader => ({ text: reader.read_str() }),
    }
  };

  it('writes and reads a packet with constant size', () => {
    const packetData = { val: 0x12345678 };
    const buffer = write_packet(mockTypes.test_const_size, packetData);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const reader = new buffer_reader(buffer);
    const result = read_packet(reader, mockTypes);

    expect(result.type).toBe(mockTypes.test_const_size);
    expect(result.packet).toEqual(packetData);
  });

  it('writes and reads a packet with dynamic size', () => {
    const packetData = { text: 'hello' };
    const buffer = write_packet(mockTypes.test_dynamic_size, packetData);
    expect(buffer).toBeInstanceOf(ArrayBuffer);

    const reader = new buffer_reader(buffer);
    const result = read_packet(reader, mockTypes);

    expect(result.type).toBe(mockTypes.test_dynamic_size);
    expect(result.packet).toEqual(packetData);
  });

  it('throws error when reading invalid packet code', () => {
    const buffer = new Uint8Array([0x99, 0x00]); // 0x99 is not in mockTypes
    const reader = new buffer_reader(buffer);
    expect(() => read_packet(reader, mockTypes)).toThrow('invalid packet code');
  });
});

describe('make_batch', () => {
  const mockTypes = {
    test_const_size: {
      code: 0x42,
      size: 4,
      write: (writer, { val }) => writer.write32(val),
      read: reader => ({ val: reader.read32() }),
    },
    test_dynamic_size: {
      code: 0x43,
      size: ({ text }) => 1 + text.length,
      write: (writer, { text }) => writer.write_str(text),
      read: reader => ({ text: reader.read_str() }),
    }
  };

  const batchType = make_batch(() => mockTypes);

  it('calculates correct batch size', () => {
    const packets = [
      { type: mockTypes.test_const_size, packet: { val: 0x11111111 } },
      { type: mockTypes.test_dynamic_size, packet: { text: 'foo' } } // 1 (len) + 3 ('foo') = 4
    ];
    // 2 (count) + (1 (code) + 4 (val)) + (1 (code) + 4 (text)) = 2 + 5 + 5 = 12
    expect(batchType.size(packets)).toBe(12);
  });

  it('writes and reads a batch of packets', () => {
    const packets = [
      { type: mockTypes.test_const_size, packet: { val: 0x12345678 } },
      { type: mockTypes.test_dynamic_size, packet: { text: 'bar' } }
    ];

    const buffer = write_packet(batchType, packets);

    // Total size should be 1 (batch code) + 12 (batch size from above) = 13 bytes
    expect(buffer.byteLength).toBe(13);

    const reader = new buffer_reader(buffer);

    // read_packet reads the outer batch wrapper
    const result = read_packet(reader, { batch: batchType });

    expect(result.type).toBe(batchType);
    expect(result.packet).toHaveLength(2);
    expect(result.packet[0]).toEqual({ type: mockTypes.test_const_size, packet: { val: 0x12345678 } });
    expect(result.packet[1]).toEqual({ type: mockTypes.test_dynamic_size, packet: { text: 'bar' } });
  });

  it('writes and reads an empty batch', () => {
    const buffer = write_packet(batchType, []);
    // 1 (code) + 2 (count) = 3 bytes
    expect(buffer.byteLength).toBe(3);

    const reader = new buffer_reader(buffer);
    const result = read_packet(reader, { batch: batchType });

    expect(result.type).toBe(batchType);
    expect(result.packet).toEqual([]);
  });
});

describe('server_packet', () => {
  const testPacketParity = (packetType, packetData) => {
    const buffer = write_packet(packetType, packetData);
    const reader = new buffer_reader(buffer);
    const result = read_packet(reader, server_packet);
    expect(result.type).toBe(packetType);
    expect(result.packet).toEqual(packetData);
  };

  it('handles info packet', () => {
    testPacketParity(server_packet.info, { version: 42 });
  });

  it('handles game_list packet with no games', () => {
    testPacketParity(server_packet.game_list, { games: [] });
  });

  it('handles game_list packet with multiple games', () => {
    testPacketParity(server_packet.game_list, {
      games: [
        { type: 1, name: 'Game1' },
        { type: 2, name: 'Game2' }
      ]
    });
  });

  it('handles join_accept packet', () => {
    testPacketParity(server_packet.join_accept, {
      cookie: 0x11111111,
      index: 5,
      seed: 0x22222222,
      difficulty: 1
    });
  });

  it('handles join_reject packet', () => {
    testPacketParity(server_packet.join_reject, {
      cookie: 0x33333333,
      reason: 2
    });
  });

  it('handles connect packet', () => {
    testPacketParity(server_packet.connect, { id: 7 });
  });

  it('handles disconnect packet', () => {
    testPacketParity(server_packet.disconnect, { id: 8, reason: 0 });
  });

  it('handles message packet', () => {
    const payload = new Uint8Array([1, 2, 3]);
    testPacketParity(server_packet.message, { id: 9, payload });
  });

  it('handles turn packet', () => {
    testPacketParity(server_packet.turn, { id: 10, turn: 100 });
  });

  it('handles batch packet', () => {
    const payload = new Uint8Array([10, 20]);
    const packets = [
      { type: server_packet.info, packet: { version: 1 } },
      { type: server_packet.message, packet: { id: 2, payload } }
    ];
    testPacketParity(server_packet.batch, packets);
  });
});

describe('client_packet', () => {
  const testPacketParity = (packetType, packetData) => {
    const buffer = write_packet(packetType, packetData);
    const reader = new buffer_reader(buffer);
    const result = read_packet(reader, client_packet);
    expect(result.type).toBe(packetType);
    expect(result.packet).toEqual(packetData);
  };

  it('handles info packet', () => {
    testPacketParity(client_packet.info, { version: 99 });
  });

  it('handles game_list packet', () => {
    testPacketParity(client_packet.game_list, {});
  });

  it('handles create_game packet', () => {
    testPacketParity(client_packet.create_game, {
      cookie: 0x55555555,
      name: 'MyGame',
      password: 'secret_password',
      difficulty: 2
    });
  });

  it('handles join_game packet', () => {
    testPacketParity(client_packet.join_game, {
      cookie: 0x66666666,
      name: 'JoinGame',
      password: 'password123'
    });
  });

  it('handles leave_game packet', () => {
    testPacketParity(client_packet.leave_game, {});
  });

  it('handles drop_player packet', () => {
    testPacketParity(client_packet.drop_player, { id: 12, reason: 3 });
  });

  it('handles message packet', () => {
    const payload = new Uint8Array([4, 5, 6]);
    testPacketParity(client_packet.message, { id: 13, payload });
  });

  it('handles turn packet', () => {
    testPacketParity(client_packet.turn, { turn: 200 });
  });

  it('handles batch packet', () => {
    const payload = new Uint8Array([30, 40]);
    const packets = [
      { type: client_packet.info, packet: { version: 2 } },
      { type: client_packet.message, packet: { id: 3, payload } }
    ];
    testPacketParity(client_packet.batch, packets);
  });
});

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

    it('throws error if buffer data is incomplete', () => {
      const buffer = new Uint8Array([5, 0, 0, 0, 10, 20]); // Length 5, but only 2 bytes of data
      const reader = new buffer_reader(buffer);
      expect(() => reader.read_buf()).toThrow('packet too small');
    });
  });
});
