import App from './App';

jest.mock('./App.scss', () => ({}));

describe('App multiplayer notice UX', () => {
  const apps = [];
  const createAppHarness = initialState => {
    const app = new App({});
    apps.push(app);
    app.state = {...app.state, ...initialState};
    app.setState = updater => {
      const next = typeof updater === 'function' ? updater(app.state) : updater;
      app.state = {...app.state, ...next};
    };
    return app;
  };

  afterEach(() => {
    while (apps.length) {
      const app = apps.pop();
      app.componentWillUnmount();
    }
  });

  it('keeps notice dismissed for status updates within the same status/category', () => {
    const app = createAppHarness({
      multiplayerStatus: 'retrying',
      multiplayerErrorCategory: 'transport_retry',
      multiplayerNoticeDismissed: true,
    });

    app.onMultiplayerStatus({
      status: 'retrying',
      category: 'transport_retry',
      message: 'Retrying multiplayer connection...',
    });

    expect(app.state.multiplayerNoticeDismissed).toBe(true);
  });

  it('re-shows notice when status category changes', () => {
    const app = createAppHarness({
      multiplayerStatus: 'retrying',
      multiplayerErrorCategory: 'transport_retry',
      multiplayerNoticeDismissed: true,
    });

    app.onMultiplayerStatus({
      status: 'failed',
      category: 'transport_error',
      message: 'Multiplayer connection failed.',
    });

    expect(app.state.multiplayerNoticeDismissed).toBe(false);
  });
});
