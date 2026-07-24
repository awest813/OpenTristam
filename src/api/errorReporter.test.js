import { buildDiagnosticsText, buildIssueUrl, describeStartupError } from './errorReporter';

const ORIGINAL_NAV_USER_AGENT = navigator.userAgent;

describe('buildIssueUrl', () => {
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
    expect(result.message).toMatch(/could not be downloaded/i);
    expect(result.message).not.toMatch(/Network Error/);
  });

  it.each([
    'Failed to fetch',
    'Load failed',
    'net::ERR_CONNECTION_RESET',
    'Request timed out',
    'Failed to load remote file',
  ])('treats %s as a network failure', (raw) => {
    expect(describeStartupError(raw).isNetwork).toBe(true);
  });

  it('treats a genuine game error as non-network and preserves the message', () => {
    const result = describeStartupError('Assertion failed in level gen');
    expect(result.isNetwork).toBe(false);
    expect(result.message).toBe('Assertion failed in level gen');
  });

  it('falls back to a generic message when none is provided', () => {
    expect(describeStartupError('').message).toBe('An unexpected error occurred.');
    expect(describeStartupError(undefined).message).toBe('An unexpected error occurred.');
  });

  it('treats any startup error as a network failure when the browser is offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const result = describeStartupError('Some unrelated message');
    expect(result.isNetwork).toBe(true);
    expect(result.message).toMatch(/offline/i);
  });
});
