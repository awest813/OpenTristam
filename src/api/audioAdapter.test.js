import { createAudioAdapter } from './audioAdapter';

function makeAudio() {
  return {
    create_sound_raw: jest.fn(),
    create_sound: jest.fn(),
    duplicate_sound: jest.fn(),
    play_sound: jest.fn(),
    set_volume: jest.fn(),
    stop_sound: jest.fn(),
    delete_sound: jest.fn(),
    stop_all: jest.fn(),
  };
}

// ─── handleAudio ─────────────────────────────────────────────────────────────

describe('createAudioAdapter — handleAudio', () => {
  it('dispatches play_sound with the provided params', () => {
    const audio = makeAudio();
    const adapter = createAudioAdapter(audio);

    adapter.handleAudio({func: 'play_sound', params: [1, 500, 0, false]});

    expect(audio.play_sound).toHaveBeenCalledWith(1, 500, 0, false);
  });

  it('dispatches set_volume with the provided params', () => {
    const audio = makeAudio();
    const adapter = createAudioAdapter(audio);

    adapter.handleAudio({func: 'set_volume', params: [2, 750]});

    expect(audio.set_volume).toHaveBeenCalledWith(2, 750);
  });

  it('dispatches stop_sound with the provided params', () => {
    const audio = makeAudio();
    const adapter = createAudioAdapter(audio);

    adapter.handleAudio({func: 'stop_sound', params: [3]});

    expect(audio.stop_sound).toHaveBeenCalledWith(3);
  });

  it('dispatches delete_sound with the provided params', () => {
    const audio = makeAudio();
    const adapter = createAudioAdapter(audio);

    adapter.handleAudio({func: 'delete_sound', params: [0]});

    expect(audio.delete_sound).toHaveBeenCalledWith(0);
  });
});

// ─── handleAudioBatch ────────────────────────────────────────────────────────

describe('createAudioAdapter — handleAudioBatch', () => {
  it('calls each audio function in the batch in order', () => {
    const audio = makeAudio();
    const adapter = createAudioAdapter(audio);
    const callOrder = [];
    audio.create_sound.mockImplementation(() => callOrder.push('create_sound'));
    audio.play_sound.mockImplementation(() => callOrder.push('play_sound'));

    adapter.handleAudioBatch({batch: [
      {func: 'create_sound', params: [0, new Uint8Array([1, 2])]},
      {func: 'play_sound', params: [0, 1000, 0, false]},
    ]});

    expect(callOrder).toEqual(['create_sound', 'play_sound']);
  });

  it('passes the correct params to each call in the batch', () => {
    const audio = makeAudio();
    const adapter = createAudioAdapter(audio);
    const data = new Uint8Array([9, 8, 7]);

    adapter.handleAudioBatch({batch: [
      {func: 'create_sound', params: [5, data]},
    ]});

    expect(audio.create_sound).toHaveBeenCalledWith(5, data);
  });

  it('handles an empty batch without throwing', () => {
    const audio = makeAudio();
    const adapter = createAudioAdapter(audio);
    expect(() => adapter.handleAudioBatch({batch: []})).not.toThrow();
  });
});

// ─── dispose ─────────────────────────────────────────────────────────────────

describe('createAudioAdapter — dispose', () => {
  it('calls stop_all() on the audio object', () => {
    const audio = makeAudio();
    const adapter = createAudioAdapter(audio);

    adapter.dispose();

    expect(audio.stop_all).toHaveBeenCalledTimes(1);
  });

  it('is safe to call dispose() more than once', () => {
    const audio = makeAudio();
    const adapter = createAudioAdapter(audio);

    adapter.dispose();
    expect(() => adapter.dispose()).not.toThrow();
    expect(audio.stop_all).toHaveBeenCalledTimes(2);
  });
});
