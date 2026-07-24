import createFs from './fs';

const fsPromise = createFs();

window.addEventListener('message', async ({ data, source, origin }) => {
  // Only accept messages from the same origin to prevent cross-origin data
  // exfiltration and unauthorized save wipes.
  if (origin !== window.location.origin) return;

  switch (data?.method) {
    case 'transfer': {
      if (!source?.postMessage) return;
      const { files } = await fsPromise;
      source.postMessage({ method: 'storage', files }, origin);
      break;
    }
    case 'clear': {
      if (!source?.postMessage) return;
      try {
        const { clear } = await fsPromise;
        await clear();
        source.postMessage({ method: 'storage', cleared: true }, origin);
      } catch (error) {
        source.postMessage(
          { method: 'storage', cleared: false, error: String(error && error.message) },
          origin
        );
      }
      break;
    }
    default:
      break;
  }
});
