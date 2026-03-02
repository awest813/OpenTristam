import getPlayerName from './savefile';

describe('getPlayerName', () => {
  it('returns null when an error occurs during parsing (e.g. malformed data)', () => {
    // Empty array buffer will cause MpqReader constructor or readHeader to throw
    const malformedData = new ArrayBuffer(0);
    const name = "spawn1.sv";

    const result = getPlayerName(malformedData, name);
    expect(result).toBeNull();
  });
});
