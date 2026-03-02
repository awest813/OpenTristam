// Required for React 18's concurrent-mode act() detection in Jest.
// Without this flag React warns "not configured to support act(...)" when
// createRoot().render() or root.unmount() are called inside act().
global.IS_REACT_ACT_ENVIRONMENT = true;
