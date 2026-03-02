import GameWorker from './game.worker.js?worker';
import init_sound from './sound';
import load_spawn from './load_spawn';
import webrtc_open from './webrtc';
import { WorkerToMain, MainToWorker } from './workerMessages';
import { createRenderAdapter } from './renderAdapter';
import { createAudioAdapter } from './audioAdapter';
import { createFsAdapter } from './fsAdapter';
import { createTransportAdapter } from './transportAdapter';

async function do_load_game(api, audio, mpq, spawn) {
  const fs = await api.fs;
  if (spawn && !mpq) {
    await load_spawn(api, fs);
  }

  const audioAdapter = createAudioAdapter(audio);
  const renderAdapter = createRenderAdapter(api.canvas, belt => api.updateBelt(belt));
  const fsAdapter = createFsAdapter(fs);

  return await new Promise((resolve, reject) => {
    try {
      const worker = new GameWorker();

      // Transport adapter owns the inbound packet queue and its flush interval.
      // WebRTC is wired in immediately after creation so the lambda below can
      // reference the adapter by closure.
      const transport = createTransportAdapter(worker, null);
      const webrtc = webrtc_open(data => transport.enqueue(data));
      transport.setWebRtc(webrtc);

      let workerTerminated = false;

      const dispose = () => {
        transport.dispose();
        if (!workerTerminated) {
          workerTerminated = true;
          worker.terminate();
        }
      };

      worker.addEventListener('message', ({data}) => {
        switch (data.action) {
        case WorkerToMain.LOADED:
          resolve((func, ...params) => worker.postMessage({action: MainToWorker.EVENT, func, params}));
          break;
        case WorkerToMain.RENDER:
          renderAdapter.handleRender(data.batch);
          break;
        case WorkerToMain.AUDIO:
          audioAdapter.handleAudio(data);
          break;
        case WorkerToMain.AUDIO_BATCH:
          audioAdapter.handleAudioBatch(data);
          break;
        case WorkerToMain.FS:
          fsAdapter.handleFs(data);
          break;
        case WorkerToMain.CURSOR:
          api.setCursorPos(data.x, data.y);
          break;
        case WorkerToMain.KEYBOARD:
          api.openKeyboard(data.rect);
          break;
        case WorkerToMain.ERROR:
          dispose();
          audioAdapter.dispose();
          api.onError(data.error, data.stack);
          break;
        case WorkerToMain.FAILED:
          dispose();
          reject({message: data.error, stack: data.stack});
          break;
        case WorkerToMain.PROGRESS:
          api.onProgress({text: data.text, loaded: data.loaded, total: data.total});
          break;
        case WorkerToMain.EXIT:
          dispose();
          api.onExit();
          break;
        case WorkerToMain.CURRENT_SAVE:
          api.setCurrentSave(data.name);
          break;
        case WorkerToMain.PACKET:
          transport.send(data.buffer);
          break;
        case WorkerToMain.PACKET_BATCH:
          transport.sendBatch(data.batch);
          break;
        default:
        }
      });

      const transfer = [];
      for (let [, file] of fs.files) {
        transfer.push(file.buffer);
      }
      worker.postMessage({action: MainToWorker.INIT, files: fs.files, mpq, spawn, offscreen: renderAdapter.offscreen}, transfer);
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
