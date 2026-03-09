import load_game from '../api/loader';
import { mapStackTrace } from 'sourcemapped-stacktrace';
import ReactGA from 'react-ga';

export function startGame(app, file) {
  if (file && /\.sv$/i.test(file.name)) {
    app.fs.then(fs => fs.upload(file)).then(() => app.onSaveUploaded());
    return;
  }
  if (app.state.show_saves) {
    return;
  }
  if (file && !/\.mpq$/i.test(file.name)) {
    window.alert('Please select an MPQ file. If you downloaded the installer from GoG, you will need to install it on PC and use the MPQ file from the installation folder.');
    return;
  }

  app.fileDropTarget.detach();
  app.setState({dropping: 0});

  const retail = !!(file && !/^spawn\.mpq$/i.test(file.name));
  if (process.env.NODE_ENV === 'production') {
    ReactGA.event({
      category: 'Game',
      action: retail ? 'Start Retail' : 'Start Shareware',
    });
  }

  app.setState({loading: true, retail});

  load_game(app, file, !retail).then(game => {
    app.game = game;
    app.runtimeListeners.attach();
    app.setState({started: true});
  }, e => handleGameError(app, e.message, e.stack));
}

export function handleGameError(app, message, stack) {
  (async () => {
    const errorObject = {message};
    if (app.saveName) {
      errorObject.save = await (await app.fs).fileUrl(app.saveName);
    }
    if (stack) {
      mapStackTrace(stack, resolvedStack => {
        app.setState(({error}) => !error && {error: {...errorObject, stack: resolvedStack.join('\n')}});
      });
    } else {
      app.setState(({error}) => !error && {error: errorObject});
    }
  })().catch(() => {
    app.setState(({error}) => !error && {error: {message}});
  });
}

export function handleGameExit(app, reloadFn = () => window.location.reload()) {
  if (!app.state.error) {
    reloadFn();
  }
}

export function handleProgress(app, progress) {
  app.setState({progress});
}

export function setCurrentSave(app, name) {
  app.saveName = name;
}

export function setCursorPos(app, x, y) {
  const rect = app.canvas.getBoundingClientRect();
  app.cursorPos = {
    x: rect.left + (rect.right - rect.left) * x / 640,
    y: rect.top + (rect.bottom - rect.top) * y / 480,
  };
  setTimeout(() => {
    app.game('DApi_Mouse', 0, 0, 0, x, y);
  });
}
