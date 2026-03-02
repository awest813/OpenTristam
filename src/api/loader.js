import Worker from './game.worker.js';
import init_sound from './sound';
import load_spawn from './load_spawn';
import webrtc_open from './webrtc';

function onRender(api, ctx, {bitmap, images, text, clip, belt}) {
  if (bitmap) {
    ctx.transferFromImageBitmap(bitmap);
  } else {
    for (let {x, y, w, h, data} of images) {
      const image = ctx.createImageData(w, h);
      image.data.set(data);
      ctx.putImageData(image, x, y);
    }
    if (text.length) {
      ctx.save();
      ctx.font = 'bold 13px Times New Roman';
      if (clip) {
        const {x0, y0, x1, y1} = clip;
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.clip();
      }
      for (let {x, y, text: str, color} of text) {
        const r = ((color >> 16) & 0xFF);
        const g = ((color >> 8) & 0xFF);
        const b = (color & 0xFF);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillText(str, x, y + 22);
      }
      ctx.restore();
    }
  }

  api.updateBelt(belt);
}

// Detect OffscreenCanvas + transferToImageBitmap support. When available the
// worker renders into its own OffscreenCanvas and ships a finished ImageBitmap
// to the main thread — no raw pixel copy needed.
function supportsOffscreen() {
  try {
    return (
      typeof OffscreenCanvas !== 'undefined' &&
      typeof OffscreenCanvas.prototype.transferToImageBitmap === 'function'
    );
  } catch (e) {
    return false;
  }
}

async function do_load_game(api, audio, mpq, spawn) {
  const fs = await api.fs;
  if (spawn && !mpq) {
    await load_spawn(api, fs);
  }

  const offscreen = supportsOffscreen();
  // Use "bitmaprenderer" when the worker will ship ImageBitmap frames;
  // fall back to a plain 2d context for the legacy pixel-copy path.
  const context = offscreen
    ? api.canvas.getContext("bitmaprenderer")
    : api.canvas.getContext("2d", {alpha: false});

  return await new Promise((resolve, reject) => {
    try {
      const worker = new Worker();

      let packetQueue = [];
      const webrtc = webrtc_open(data => {
        packetQueue.push(data);
      });

      let packetInterval = setInterval(() => {
        if (packetQueue.length) {
          worker.postMessage({action: "packetBatch", batch: packetQueue}, packetQueue);
          packetQueue.length = 0;
        }
      }, 20);

      const stopInterval = () => {
        if (packetInterval !== null) {
          clearInterval(packetInterval);
          packetInterval = null;
        }
      };

      worker.addEventListener("message", ({data}) => {
        switch (data.action) {
        case "loaded":
          resolve((func, ...params) => worker.postMessage({action: "event", func, params}));
          break;
        case "render":
          onRender(api, context, data.batch);
          break;
        case "audio":
          audio[data.func](...data.params);
          break;
        case "audioBatch":
          for (let {func, params} of data.batch) {
            audio[func](...params);
          }
          break;
        case "fs":
          fs[data.func](...data.params);
          break;
        case "cursor":
          api.setCursorPos(data.x, data.y);
          break;
        case "keyboard":
          api.openKeyboard(data.rect);
          break;
        case "error":
          stopInterval();
          audio.stop_all();
          worker.terminate();
          api.onError(data.error, data.stack);
          break;
        case "failed":
          stopInterval();
          worker.terminate();
          reject({message: data.error, stack: data.stack});
          break;
        case "progress":
          api.onProgress({text: data.text, loaded: data.loaded, total: data.total});
          break;
        case "exit":
          stopInterval();
          worker.terminate();
          api.onExit();
          break;
        case "current_save":
          api.setCurrentSave(data.name);
          break;
        case "packet":
          webrtc.send(data.buffer);
          break;
        case "packetBatch":
          for (let packet of data.batch) {
            webrtc.send(packet);
          }
          break;
        default:
        }
      });
      const transfer = [];
      for (let [, file] of fs.files) {
        transfer.push(file.buffer);
      }
      worker.postMessage({action: "init", files: fs.files, mpq, spawn, offscreen}, transfer);
      delete fs.files;
    } catch (e) {
      reject(e);
    }
  });
}

export default function load_game(api, mpq, spawn) {
  const audio = init_sound();
  return do_load_game(api, audio, mpq, spawn);
}
