function no_sound() {
  return {
    create_sound_raw: () => undefined,
    create_sound: () => undefined,
    duplicate_sound: () => undefined,
    play_sound: () => undefined,
    set_volume: () => undefined,
    stop_sound: () => undefined,
    delete_sound: () => undefined,
    stop_all: () => undefined,
  };
}

function decodeAudioData(context, buffer) {
  return new Promise((resolve, reject) => {
    context.decodeAudioData(buffer, resolve, reject);
  });
}

function safeStop(source) {
  try { source.stop(); } catch (e) { /* already ended */ }
  try { source.disconnect(); } catch (e) { /* already disconnected */ }
}

export default function init_sound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const StereoPannerNode = window.StereoPannerNode;
  if (!AudioContext) {
    return no_sound();
  }

  let context = null;
  try {
    context = new AudioContext();
    context.resume();
  } catch (e) {
  }
  const sounds = new Map();

  // Wire gain → [panner →] destination once at sound-creation time so that
  // repeated play_sound calls only attach a fresh BufferSource → gain and do
  // not accumulate extra connections through the rest of the chain.
  function wireChain(gain, panner) {
    if (panner) {
      gain.connect(panner);
      panner.connect(context.destination);
    } else {
      gain.connect(context.destination);
    }
  }

  function makeSound(buffer) {
    const gain = context.createGain();
    const panner = StereoPannerNode ? new StereoPannerNode(context, {pan: 0}) : null;
    wireChain(gain, panner);
    return {buffer, gain, panner};
  }

  return {
    create_sound_raw(id, data, length, channels, rate) {
      if (!context) {
        return;
      }
      const buffer = context.createBuffer(channels, length, rate);
      for (let i = 0; i < channels; ++i) {
        buffer.getChannelData(i).set(data.subarray(i * length, i * length + length));
      }
      sounds.set(id, makeSound(Promise.resolve(buffer)));
    },
    create_sound(id, data) {
      if (!context) {
        return;
      }
      sounds.set(id, makeSound(decodeAudioData(context, data.buffer)));
    },
    duplicate_sound(id, srcId) {
      if (!context) {
        return;
      }
      const src = sounds.get(srcId);
      if (!src) {
        return;
      }
      sounds.set(id, makeSound(src.buffer));
    },
    play_sound(id, volume, pan, loop) {
      if (!context) {
        return;
      }
      // Resume context if a browser policy suspended it before user interaction.
      if (context.state === 'suspended') {
        context.resume();
      }
      const src = sounds.get(id);
      if (src) {
        if (src.source) {
          src.source.then(safeStop);
          src.source = null;
        }
        src.gain.gain.value = Math.pow(2.0, volume / 1000.0);
        if (src.panner) {
          const relVolume = Math.pow(2.0, pan / 1000.0);
          src.panner.pan.value = 1.0 - 2.0 / (1.0 + relVolume);
        }
        src.source = src.buffer.then(buffer => {
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.loop = !!loop;
          // Only connect source → gain; the rest of the chain (gain→destination)
          // was wired once at creation and must not be duplicated here.
          source.connect(src.gain);
          source.start();
          return source;
        });
      }
    },
    set_volume(id, volume) {
      const src = sounds.get(id);
      if (src) {
        src.gain.gain.value = Math.pow(2.0, volume / 1000.0);
      }
    },
    stop_sound(id) {
      const src = sounds.get(id);
      if (src && src.source) {
        src.source.then(safeStop);
        src.source = null;
      }
    },
    delete_sound(id) {
      const src = sounds.get(id);
      if (src) {
        if (src.source) {
          src.source.then(safeStop);
          src.source = null;
        }
        // Disconnect the persistent chain so the nodes can be GC'd.
        try { if (src.panner) src.panner.disconnect(); } catch (e) {}
        try { src.gain.disconnect(); } catch (e) {}
      }
      sounds.delete(id);
    },

    stop_all() {
      for (let [, sound] of sounds) {
        if (sound.source) {
          sound.source.then(safeStop);
          sound.source = null;
        }
        try { if (sound.panner) sound.panner.disconnect(); } catch (e) {}
        try { sound.gain.disconnect(); } catch (e) {}
      }
      sounds.clear();
      if (context) {
        context.close();
        context = null;
      }
    }
  };
}
