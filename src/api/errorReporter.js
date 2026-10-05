import React from 'react';

export const ExternalLink = ({ children, ...props }) => (
  <a target="_blank" rel="noopener noreferrer" {...props}>
    {children}
  </a>
);

// Low-level messages that mean "the asset download didn't make it" rather than
// an actual game bug — fetch throws "Failed to fetch"/"Load failed", older
// XHR paths surface "Network Error", and the worker's RemoteFile throws its own
// string. Server-side and throttling HTTP statuses are transient too; the
// service worker also answers offline misses with a synthetic 503.
const NETWORK_ERROR_PATTERNS = [
  /request failed with status code (5\d\d|408|429)\b/i,
  /network error/i,
  /failed to fetch/i,
  /load failed/i,
  /net::/i,
  /ERR_/,
  /timeout/i,
  /timed out/i,
  /failed to load remote file/i,
];

// Known engine/loader strings that should never be shown raw to players.
// `isData` marks problems with the game files rather than crashes: they are
// not bugs to report, and the overlay frames them differently.
const FRIENDLY_ERROR_PATTERNS = [
  {
    pattern: /spawn\.mpq is not available on this server/i,
    isData: true,
    message:
      'This site doesn’t host the shareware data. Use Select MPQ to load your own spawn.mpq (shareware) or DIABDAT.MPQ (full game).',
  },
  {
    pattern: /request failed with status code 404\b/i,
    isData: true,
    message:
      'Some game data couldn’t be found on the server. Reload the page to get the latest version, then try again.',
  },
  {
    pattern: /invalid spawn\.mpq size/i,
    isData: true,
    message:
      'The shareware download looks incomplete or corrupted. Clear your browser cache, then reload and try again.',
  },
  {
    pattern: /invalid mpq/i,
    isData: true,
    message:
      'That file doesn’t look like a valid Diablo MPQ. Use DIABDAT.MPQ from a retail install, or try the shareware option.',
  },
  {
    pattern: /assertion failed/i,
    message:
      'The game hit an internal error and had to stop. You can report it on GitHub if it keeps happening.',
  },
];

/**
 * Translate a raw startup error message into friendly, actionable copy.
 *
 * Network/offline failures during the data download are not bugs, so we give
 * the player a short tip instead of an inscrutable "Network Error". The raw
 * message is left untouched on the error object so the GitHub issue report
 * still carries the original detail.
 *
 * @param {string|undefined} rawMessage The original error message.
 * @returns {{isNetwork: boolean, isData: boolean, message: string}}
 */
export function describeStartupError(rawMessage) {
  const message = typeof rawMessage === 'string' ? rawMessage : '';
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const networkResult = () => ({
    isNetwork: true,
    isData: false,
    // Lead line already says the download failed — keep the body as the tip.
    message: offline
      ? 'Reconnect to the internet, then try again.'
      : 'Check your connection and try again. This is usually temporary.',
  });

  if (NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return networkResult();
  }

  // Known game/data errors win over the offline hint: cached games can run
  // offline, and reconnecting would not fix a corrupt MPQ.
  for (const entry of FRIENDLY_ERROR_PATTERNS) {
    if (entry.pattern.test(message)) {
      return { isNetwork: false, isData: !!entry.isData, message: entry.message };
    }
  }

  if (offline) {
    return networkResult();
  }

  return {
    isNetwork: false,
    isData: false,
    message: message || 'Something unexpected went wrong. Try restarting the game.',
  };
}

export function buildDiagnosticsText(error, retail) {
  const message = (error && error.message) || 'Unknown error';
  const stack = error && error.stack ? `\n${error.stack}` : '';
  const agent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  return [
    `OpenTristam ${process.env.VERSION || 'unknown'} (${retail ? 'Retail' : 'Shareware'})`,
    `User agent: ${agent}`,
    '',
    message + stack,
  ].join('\n');
}

// GitHub rejects very long "new issue" URLs (~8 KB), and a source-mapped stack
// can exceed that on its own. Keep the report link usable.
const ISSUE_DETAILS_MAX_CHARS = 2500;

export function buildIssueUrl(error, retail) {
  let message = (error.message || 'Unknown error') + (error.stack ? '\n' + error.stack : '');
  if (message.length > ISSUE_DETAILS_MAX_CHARS) {
    message =
      message.slice(0, ISSUE_DETAILS_MAX_CHARS) +
      '\n… (truncated — use "Copy details" in the error dialog for the full text)';
  }
  const url = new URL('https://github.com/awest813/OpenTristam/issues/new');
  url.searchParams.set(
    'body',
    `**Description:**
[Please describe what you were doing before the error occurred]

**App version:**
OpenTristam ${process.env.VERSION || 'unknown'} (${retail ? 'Retail' : 'Shareware'})

**Error message:**
    
${message
  .split('\n')
  .map((line) => '    ' + line)
  .join('\n')}

**User agent:**

    ${navigator.userAgent}

**Save file:**
[Please attach the save file, if applicable. The error box should have a link to download the current save you were playing; alternatively, use the Download button in the Manage Saves screen.]
`
  );
  return url.toString();
}
