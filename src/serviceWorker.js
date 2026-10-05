// Registers public/service-worker.js in production builds. It precaches the app
// shell and code so the app opens offline, and caches the engine and game data
// as they are first used. New versions wait until the player confirms the
// update banner (see applyUpdate).

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  // [::1] is the IPv6 localhost address.
  window.location.hostname === '[::1]' ||
  // 127.0.0.1/8 is considered localhost for IPv4.
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

const invokeCallback = (callback, arg) => {
  if (typeof callback === 'function') {
    callback(arg);
  }
};

/**
 * Sends a SKIP_WAITING message to the waiting service worker so it activates
 * immediately, then reloads the page once the new SW takes control.
 *
 * @param {ServiceWorkerRegistration} registration
 * @returns {Promise<void>}
 */
export async function applyUpdate(registration) {
  const waiting = registration && registration.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  // Listen for the new SW to become the controller, then reload.
  await new Promise((resolve) => {
    navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
    waiting.postMessage('SKIP_WAITING');
  });
  window.location.reload();
}

export function register(config) {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
    return;
  }

  // The URL constructor is available in all browsers that support SW.
  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
  if (publicUrl.origin !== window.location.origin) {
    // Our service worker won't work if PUBLIC_URL is on a different origin
    // from what our page is served on. This might happen if a CDN is used to
    // serve assets; see https://github.com/facebook/create-react-app/issues/2374
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    if (isLocalhost) {
      // This is running on localhost. Let's check if a service worker still exists or not.
      checkValidServiceWorker(swUrl, config);

      return;
    }

    // Is not localhost. Just register service worker.
    registerValidSW(swUrl, config);
  });
}

// Long play sessions never navigate, so the browser would not look for a new
// version on its own; check periodically while the page is visible.
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // An update downloaded in an earlier visit (e.g. the prompt was
      // dismissed) is still waiting: offer it again.
      if (registration.waiting && navigator.serviceWorker.controller) {
        invokeCallback(config?.onUpdate, registration);
      }

      setInterval(() => {
        if (!document.hidden) {
          registration.update().catch(() => {});
        }
      }, UPDATE_CHECK_INTERVAL_MS);

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state !== 'installed') {
            return;
          }

          if (navigator.serviceWorker.controller) {
            // A new version has been downloaded and is waiting to activate.
            // Notify the app — it will prompt the user before applying.
            console.log('New content available; waiting for user confirmation to apply update.');
            invokeCallback(config?.onUpdate, registration);
            return;
          }

          // First install: content is now cached for offline use.
          console.log('Content is cached for offline use.');
          invokeCallback(config?.onSuccess, registration);
        };
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

async function checkValidServiceWorker(swUrl, config) {
  // Check if the service worker can be found. If it can't reload the page.
  try {
    const response = await fetch(swUrl);

    // Ensure service worker exists, and that we really are getting a JS file.
    const contentType = response.headers.get('content-type');
    const isJavaScript = contentType != null && contentType.includes('javascript');

    if (response.status === 404 || !isJavaScript) {
      // No service worker found. Probably a different app. Reload the page.
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      window.location.reload();
      return;
    }

    // Service worker found. Proceed as normal.
    registerValidSW(swUrl, config);
  } catch (error) {
    console.log('No internet connection found. App is running in offline mode.');
  }
}

export function unregister() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    registration.unregister();
  });
}
