import { buildDiagnosticsText, buildIssueUrl, describeStartupError } from './errorReporter';

const ORIGINAL_NAV_USER_AGENT = navigator.userAgent;

describe('buildIssueUrl', () => {
  it('keeps the report URL short enough for GitHub with a huge stack', () => {
    const stack = Array.from({ length: 2000 }, (_, i) => `    at frame${i} (file.js:${i}:1)`).join(
      '\n'
    );
    const url = buildIssueUrl({ message: 'Boom', stack }, false);
    expect(url.length).toBeLessThan(8000);
    expect(decodeURIComponent(new URL(url).searchParams.get('body'))).toMatch(/truncated/);
  });

  const retail = true;
  // shareware = false is the implicit alternative; only retail is needed here

  it('returns a valid GitHub new-issue URL', () => {
    const url = buildIssueUrl({ message: 'Test error' }, retail);
    expect(url).toMatch(/^https:\/\/github\.com\/awest813\/OpenTristam\/issues\/new\?/);
  });

  it('includes the error message in the issue body', () => {
    const url = buildIssueUrl({ message: 'Something went wrong' }, retail);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain('Something went wrong');
  });

  it('includes the stack trace when provided', () => {
    const error = { message: 'boom', stack: 'at foo.js:1\nat bar.js:2' };
    const url = buildIssueUrl(error, retail);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain('at foo.js:1');
    expect(body).toContain('at bar.js:2');
  });

  it('labels the version as Retail when retail is true', () => {
    const url = buildIssueUrl({ message: 'err' }, true);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain('Retail');
    expect(body).not.toContain('Shareware');
  });

  it('labels the version as Shareware when retail is false', () => {
    const url = buildIssueUrl({ message: 'err' }, false);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain('Shareware');
    expect(body).not.toContain('Retail');
  });

  it('falls back to "Unknown error" when message is absent', () => {
    const url = buildIssueUrl({}, retail);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain('Unknown error');
  });

  it('includes the navigator.userAgent string', () => {
    const url = buildIssueUrl({ message: 'err' }, retail);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain(ORIGINAL_NAV_USER_AGENT);
  });
});

describe('buildDiagnosticsText', () => {
  it('includes version, mode, message, and stack', () => {
    const text = buildDiagnosticsText({ message: 'boom', stack: 'at foo.js:1' }, true);
    expect(text).toContain('Retail');
    expect(text).toContain('boom');
    expect(text).toContain('at foo.js:1');
    expect(text).toContain(ORIGINAL_NAV_USER_AGENT);
  });
});

describe('describeStartupError', () => {
  afterEach(() => {
    // Restore the default online state in case a test toggled it.
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('flags axios "Network Error" as a network failure with friendly copy', () => {
    const result = describeStartupError('Network Error');
    expect(result.isNetwork).toBe(true);
    expect(result.message).toMatch(/check your connection/i);
    expect(result.message).not.toMatch(/Network Error/);
  });

  it.each([
    'Failed to fetch',
    'Load failed',
    'net::ERR_CONNECTION_RESET',
    'Request timed out',
    'Failed to load remote file',
    'Request failed with status code 503',
    'Request failed with status code 502',
    'Request failed with status code 429',
  ])('treats %s as a network failure', (raw) => {
    expect(describeStartupError(raw).isNetwork).toBe(true);
  });

  it('points to Select MPQ when the host does not ship shareware data', () => {
    const result = describeStartupError('spawn.mpq is not available on this server.');
    expect(result.isNetwork).toBe(false);
    expect(result.message).toMatch(/Select MPQ/);
  });

  it('explains a missing asset (404) without calling it a connection problem', () => {
    const result = describeStartupError('Request failed with status code 404');
    expect(result.isNetwork).toBe(false);
    expect(result.message).toMatch(/couldn’t be found/i);
  });

  it('treats a genuine game error as non-network and preserves unknown messages', () => {
    const result = describeStartupError('Something went terribly wrong');
    expect(result.isNetwork).toBe(false);
    expect(result.message).toBe('Something went terribly wrong');
  });

  it('maps known technical errors to friendly copy', () => {
    expect(describeStartupError('invalid MPQ file').message).toMatch(/valid Diablo MPQ/i);
    expect(describeStartupError('Invalid spawn.mpq size. Try clearing cache').message).toMatch(
      /shareware download/i
    );
    expect(describeStartupError('Assertion failed in level gen').message).toMatch(
      /internal error/i
    );
  });

  it('falls back to a generic message when none is provided', () => {
    expect(describeStartupError('').message).toMatch(/unexpected/i);
    expect(describeStartupError(undefined).message).toMatch(/unexpected/i);
  });

  it('treats any startup error as a network failure when the browser is offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const result = describeStartupError('Some unrelated message');
    expect(result.isNetwork).toBe(true);
    expect(result.message).toMatch(/reconnect/i);
  });

  it('keeps known game errors when offline, since cached games can run offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const result = describeStartupError('invalid MPQ file');
    expect(result.isNetwork).toBe(false);
    expect(result.message).toMatch(/valid Diablo MPQ/i);
  });
});
