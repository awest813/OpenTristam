import createFs from './fs';

const fsPromise = createFs();

window.addEventListener('message', async ({ data, source, origin }) => {
  // Only accept messages from the same origin to prevent cross-origin data
  // exfiltration and unauthorized save wipes.
  if (origin !== window.location.origin) return;

  switch (data?.method) {
    case 'transfer': {
      if (!source?.postMessage) return;
      const fs = await fsPromise;
      // Large archives (*.mpq) are read lazily; load them so a transfer
      // carries the full storage contents.
      if (typeof fs.list === 'function' && typeof fs.load === 'function') {
        await Promise.all(fs.list().map((name) => fs.load(name).catch(() => undefined)));
      }
      source.postMessage({ method: 'storage', files: fs.files }, origin);
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
