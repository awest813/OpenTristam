import React from 'react';

export const ExternalLink = ({ children, ...props }) => (
  <a target="_blank" rel="noopener noreferrer" {...props}>
    {children}
  </a>
);

// Low-level messages that mean "the asset download didn't make it" rather than
// an actual game bug — axios surfaces "Network Error", fetch throws "Failed to
// fetch"/"Load failed", and the worker's RemoteFile throws its own string.
const NETWORK_ERROR_PATTERNS = [
  /network error/i,
  /failed to fetch/i,
  /load failed/i,
  /net::/i,
  /ERR_/,
  /timeout/i,
  /timed out/i,
  /failed to load remote file/i,
];

/**
 * Translate a raw startup error message into friendly, actionable copy.
 *
 * Network/offline failures during the data download are not bugs, so we give
 * the player a "check your connection and try again" message instead of an
 * inscrutable "Network Error". The raw message is left untouched on the error
 * object so the GitHub issue report still carries the original detail.
 *
 * @param {string|undefined} rawMessage The original error message.
 * @returns {{isNetwork: boolean, message: string}}
 */
export function describeStartupError(rawMessage) {
  const message = typeof rawMessage === 'string' ? rawMessage : '';
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const looksNetwork = offline || NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(message));

  if (looksNetwork) {
    return {
      isNetwork: true,
      message: offline
        ? 'You appear to be offline. The game data could not be downloaded — reconnect to the internet and try again.'
        : 'The game data could not be downloaded. This is usually a temporary network problem — check your connection and try again.',
    };
  }

  return {
    isNetwork: false,
    message: message || 'An unexpected error occurred.',
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

export function buildIssueUrl(error, retail) {
  const message = (error.message || 'Unknown error') + (error.stack ? '\n' + error.stack : '');
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
