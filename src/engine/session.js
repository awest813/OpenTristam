import load_game from '../api/loader';
import { mapStackTrace } from 'sourcemapped-stacktrace';
import ReactGA from 'react-ga';

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

/**
 * Soft-reset the shell back to the start screen without a full page reload.
 * Used after recoverable boot/runtime failures so players can try again.
 *
 * @param {object} app App instance.
 */
export function resetToStart(app) {
  if (app.runtimeListeners && typeof app.runtimeListeners.detach === 'function') {
    app.runtimeListeners.detach();
  }
  if (app.game && typeof app.game === 'object' && typeof app.game.dispose === 'function') {
    try {
      app.game.dispose();
    } catch (e) {
      // Best-effort cleanup; ignore dispose failures during recovery.
    }
  }
  app.game = null;
  if (app.fileDropTarget && typeof app.fileDropTarget.attach === 'function') {
    app.fileDropTarget.attach();
  }
  app.setState({
    loading: false,
    started: false,
    error: null,
    progress: null,
    compress: false,
    show_saves: false,
    dropping: 0,
  });
}

export function startGame(app, file) {
  if (file && /\.sv$/i.test(file.name)) {
    app.fs
      .then((fs) => {
        if (fs.initError) {
          throw fs.initError;
        }
        return fs.upload(file);
      })
      .then(() => {
        app.onSaveUploaded();
        notify(app, {
          tone: 'success',
          message: `Imported save “${file.name}”. Open Manage Saves to download or remove it.`,
        });
      })
      .catch(() => {
        notify(app, {
          tone: 'error',
          message: `Could not import “${file.name}”. Make sure it is a valid .sv save file and that browser storage is available.`,
        });
      });
    return;
  }
  if (app.state.show_saves) {
    if (file) {
      notify(app, {
        tone: 'info',
        message: 'Close Manage Saves first, then drop an MPQ to start the game.',
      });
    }
    return;
  }
  if (file && !/\.mpq$/i.test(file.name)) {
    notify(app, {
      tone: 'error',
      message:
        'That is not an MPQ file. Diablo data comes as DIABDAT.MPQ — if you have a GoG installer, install it on PC first and use the MPQ from the install folder.',
    });
    return;
  }

  // Guard against re-entrant launches (double-click on Play, or dropping a file
  // mid-load) that would otherwise spawn a second worker and a duplicate
  // multi-megabyte asset download.
  if (app.state.loading || app.state.started) {
    notify(app, {
      tone: 'info',
      message: app.state.loading ? 'Already loading — hang tight.' : 'The game is already running.',
    });
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

  app.setState({ loading: true, retail, error: null });

  load_game(app, file, !retail).then(
    (game) => {
      app.game = game;
      app.runtimeListeners.attach();
      app.setState({ started: true, loading: false });
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
    const errorObject = { message };
    if (app.saveName) {
      errorObject.save = await (await app.fs).fileUrl(app.saveName);
    }
    const applyError = (error) => {
      app.setState(({ error: existing }) =>
        !existing
          ? {
              error,
              loading: false,
              // Keep `started` as-is for in-game crashes so canvas state is clear,
              // but ensure boot failures leave the shell on the error overlay.
              started: false,
            }
          : null
      );
    };
    if (stack) {
      mapStackTrace(stack, (resolvedStack) => {
        applyError({ ...errorObject, stack: resolvedStack.join('\n') });
      });
    } else {
      applyError(errorObject);
    }
  })().catch(() => {
    app.setState(({ error }) =>
      !error ? { error: { message }, loading: false, started: false } : null
    );
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
