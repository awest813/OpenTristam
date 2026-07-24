import load_game from '../api/loader';
import { mapStackTrace } from 'sourcemapped-stacktrace';
import ReactGA from 'react-ga';
import getPlayerName from '../api/savefile';

/**
 * Surface a transient startup notice through the app, if it exposes one.
 *
 * @param {object} app App instance.
 * @param {{tone: string, message: string}} notice Notice payload.
 */
function notify(app, notice) {
  if (app && typeof app.showStartupNotice === 'function') {
    app.showStartupNotice(notice);
  }
}

function revokeErrorSaveUrl(app) {
  if (app && app._errorSaveUrl) {
    try {
      URL.revokeObjectURL(app._errorSaveUrl);
    } catch (_e) {
      // ignore
    }
    app._errorSaveUrl = null;
  }
}

export function startGame(app, file) {
  if (file && /\.sv$/i.test(file.name)) {
    app.fs
      .then((fs) => fs.upload(file))
      .then(async () => {
        if (typeof app.refreshSaves === 'function') {
          await app.refreshSaves();
        } else if (typeof app.onSaveUploaded === 'function') {
          app.onSaveUploaded();
        }
        const fs = await app.fs;
        const data = fs.files && fs.files.get(file.name.toLowerCase());
        const info = data ? getPlayerName(data, file.name) : null;
        if (info) {
          notify(app, {
            tone: 'success',
            message: `Imported save “${file.name}”. Open Manage Saves to download or remove it.`,
          });
        } else {
          notify(app, {
            tone: 'info',
            message: `Imported “${file.name}”, but hero data couldn’t be read. The file may be damaged.`,
          });
        }
      })
      .catch(() => {
        notify(app, {
          tone: 'error',
          message: `Couldn’t import “${file.name}”. Make sure it’s a valid .sv save file.`,
        });
      });
    return;
  }
  if (app.state.show_saves) {
    return;
  }
  if (file && !/\.mpq$/i.test(file.name)) {
    notify(app, {
      tone: 'error',
      message:
        'That isn’t an MPQ file. Use DIABDAT.MPQ from a Diablo install (for example from GOG), or drop a .sv save instead.',
    });
    return;
  }

  // Guard against re-entrant launches (double-click on Play, or dropping a file
  // mid-load) that would otherwise spawn a second worker and a duplicate
  // multi-megabyte asset download.
  if (app.state.loading || app.state.started) {
    return;
  }

  app.fileDropTarget.detach();
  app.setState({ dropping: 0 });

  const retail = !!(file && !/^spawn\.mpq$/i.test(file.name));
  if (process.env.NODE_ENV === 'production') {
    ReactGA.event({
      category: 'Game',
      action: retail ? 'Start Retail' : 'Start Shareware',
    });
  }

  app.setState({ loading: true, retail });

  load_game(app, file, !retail).then(
    (game) => {
      app.game = game;
      app.runtimeListeners.attach();
      app.setState({ started: true });
    },
    (e) => handleGameError(app, e.message, e.stack)
  );
}

/**
 * Build and surface a recoverable game error state.
 *
 * @param {object} app App instance containing state setters and save context.
 * @param {string} message User-facing error message.
 * @param {string|undefined} stack Optional stack trace from worker/runtime.
 */
export function handleGameError(app, message, stack) {
  (async () => {
    revokeErrorSaveUrl(app);
    const errorObject = { message };
    if (app.saveName) {
      const url = await (await app.fs).fileUrl(app.saveName);
      if (url) {
        app._errorSaveUrl = url;
        errorObject.save = url;
      }
    }
    if (stack) {
      mapStackTrace(stack, (resolvedStack) => {
        app.setState(
          ({ error }) => !error && { error: { ...errorObject, stack: resolvedStack.join('\n') } }
        );
      });
    } else {
      app.setState(({ error }) => !error && { error: errorObject });
    }
  })().catch(() => {
    app.setState(({ error }) => !error && { error: { message } });
  });
}

/**
 * Reload the app when the game exits without an active error overlay.
 *
 * @param {object} app App instance containing current UI state.
 * @param {Function} reloadFn Optional reload implementation for tests.
 */
export function handleGameExit(app, reloadFn = () => window.location.reload()) {
  if (!app.state.error) {
    revokeErrorSaveUrl(app);
    reloadFn();
  }
}

/**
 * Update loading progress state used by the loading UI.
 *
 * @param {object} app App instance.
 * @param {{text?: string, loaded?: number, total?: number}} progress Loading progress payload.
 */
export function handleProgress(app, progress) {
  app.setState({ progress });
}

/**
 * Persist current save name for later error-recovery download links.
 *
 * @param {object} app App instance.
 * @param {string} name Save file name.
 */
export function setCurrentSave(app, name) {
  app.saveName = name;
}

/**
 * Translate in-game cursor coordinates to viewport coordinates for touch overlays.
 *
 * @param {object} app App instance containing canvas and game bridge.
 * @param {number} x In-game X coordinate.
 * @param {number} y In-game Y coordinate.
 */
export function setCursorPos(app, x, y) {
  const rect = app.canvas.getBoundingClientRect();
  app.cursorPos = {
    x: rect.left + ((rect.right - rect.left) * x) / 640,
    y: rect.top + ((rect.bottom - rect.top) * y) / 480,
  };
  setTimeout(() => {
    app.game('DApi_Mouse', 0, 0, 0, x, y);
  });
}
