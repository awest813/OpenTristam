import GameWorker from './game.worker.js?worker';
import init_sound from './sound';
import load_spawn from './load_spawn';
import { WorkerToMain, MainToWorker } from './workerMessages';
import { createRenderAdapter } from './renderAdapter';
import { createAudioAdapter } from './audioAdapter';
import { createFsAdapter } from './fsAdapter';
import { createTransportAdapter } from './transportAdapter';
import { createTransport } from './transports';
import { createMultiplayerDiagnostics } from './multiplayerDiagnostics';
import { createLazyMultiplayerTransport } from './lazyMultiplayerTransport';
import { createStartupProgress } from './startupProgress';

async function do_load_game(api, audio, mpq, spawn) {
  const fs = await api.fs;
  const progress = createStartupProgress(api);
  if (spawn && !mpq) {
    await load_spawn({ onProgress: progress.download }, fs);
  }

  const audioAdapter = createAudioAdapter(audio);
  const renderAdapter = createRenderAdapter(api.canvas, (belt) => api.updateBelt(belt));
  const fsAdapter = createFsAdapter(fs, {
    onPersistError: () => {
      if (typeof api.onStorageFailure === 'function') {
        api.onStorageFailure();
      } else if (typeof api.showStartupNotice === 'function') {
        api.showStartupNotice({
          tone: 'error',
          message:
            'Couldn’t save progress to browser storage. Check available space and try again.',
        });
      }
    },
  });

  // Pause canvas rendering while the tab is hidden to reduce idle CPU load.
  // The game simulation in the worker is unaffected — only draw calls are
  // suppressed. We re-enable immediately when the tab becomes visible again.
  const onVisibilityChange = () => {
    renderAdapter.setVisible(!document.hidden);
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return await new Promise((resolve, reject) => {
    try {
      const worker = new GameWorker();
      const diagnostics = createMultiplayerDiagnostics({
        onEvent: (event) => {
          if (api.onMultiplayerEvent) {
            api.onMultiplayerEvent(event);
          }
        },
        onStatusChange: (status) => {
          if (api.onMultiplayerStatus) {
            api.onMultiplayerStatus(status);
          }
        },
      });

      // Transport adapter owns the inbound packet queue and its flush interval.
      // WebRTC is wired in immediately after creation so the lambda below can
      // reference the adapter by closure.
      const transport = createTransportAdapter(worker, null, {
        onInboundPacket: (packet) => diagnostics.observeInboundPacket(packet),
        onOutboundPacket: (packet) => diagnostics.observeOutboundPacket(packet),
      });
      const multiplayerOptions = api.multiplayerOptions || {};

      const createMultiplayerTransport = () =>
        createTransport(multiplayerOptions, {
          onPacket: (data) => transport.enqueue(data),
          onLifecycle: (event) => diagnostics.observeTransportLifecycle(event),
          onError: (error) => diagnostics.observeTransportError(error),
        });
      const multiplayerTransport = createLazyMultiplayerTransport({
        createTransport: createMultiplayerTransport,
      });
      transport.setTransport(multiplayerTransport);
      if (api.onMultiplayerStatus) {
        api.onMultiplayerStatus(diagnostics.getStatus());
      }

      let workerTerminated = false;

      const dispose = () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        transport.dispose();
        multiplayerTransport.dispose();
        audioAdapter.dispose();
        if (!workerTerminated) {
          workerTerminated = true;
          worker.terminate();
        }
      };

      worker.addEventListener('message', ({ data }) => {
        switch (data.action) {
          case WorkerToMain.LOADED:
            {
              const gameApi = (func, ...params) =>
                worker.postMessage({ action: MainToWorker.EVENT, func, params });
              gameApi.retryMultiplayer = () => {
                diagnostics.recordAppAction('retry_requested');
                multiplayerTransport.reconnect();
              };
              gameApi.reconnectMultiplayer = () => {
                diagnostics.recordAppAction('reconnect_requested');
                multiplayerTransport.replace();
              };
              gameApi.getMultiplayerDiagnostics = () => diagnostics.getEvents();
              gameApi.getMultiplayerStatus = () => diagnostics.getStatus();
              // Soft recovery (Back to start) needs an explicit dispose hook.
              gameApi.dispose = dispose;
              resolve(gameApi);
            }
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
            api.onError(data.error, data.stack);
            break;
          case WorkerToMain.FAILED:
            dispose();
            reject({ message: data.error, stack: data.stack });
            break;
          case WorkerToMain.PROGRESS:
            progress.worker({ text: data.text, loaded: data.loaded, total: data.total });
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

      // Copy buffers before transfer so main-thread fs.files stays usable for
      // Save Manager and soft recovery after the worker boots.
      const filesPayload = new Map();
      const transfer = [];
      for (const [name, file] of fs.files) {
        const copy = file.slice();
        filesPayload.set(name, copy);
        transfer.push(copy.buffer);
      }
      worker.postMessage(
        {
          action: MainToWorker.INIT,
          files: filesPayload,
          mpq,
          spawn,
          offscreen: renderAdapter.offscreen,
        },
        transfer
      );
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Initialize and boot the game worker using either a retail MPQ or shareware assets.
 *
 * @param {object} api Runtime surface exposed by App for rendering, input, and callbacks.
 * @param {File|undefined|null} mpq Uploaded MPQ file when launching retail mode.
 * @param {boolean} spawn Whether to launch in shareware (spawn) mode.
 * @returns {Promise<Function>} Promise resolving to a callable game API bridge.
 */
export default function load_game(api, mpq, spawn) {
  const audio = init_sound();
  return do_load_game(api, audio, mpq, spawn);
}
