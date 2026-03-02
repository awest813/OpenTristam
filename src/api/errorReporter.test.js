import { buildIssueUrl } from './errorReporter';

const ORIGINAL_NAV_USER_AGENT = navigator.userAgent;

describe('buildIssueUrl', () => {
  const retail = true;
  const shareware = false;

  it('returns a valid GitHub new-issue URL', () => {
    const url = buildIssueUrl({message: 'Test error'}, retail);
    expect(url).toMatch(/^https:\/\/github\.com\/d07RiV\/diabloweb\/issues\/new\?/);
  });

  it('includes the error message in the issue body', () => {
    const url = buildIssueUrl({message: 'Something went wrong'}, retail);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain('Something went wrong');
  });

  it('includes the stack trace when provided', () => {
    const error = {message: 'boom', stack: 'at foo.js:1\nat bar.js:2'};
    const url = buildIssueUrl(error, retail);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain('at foo.js:1');
    expect(body).toContain('at bar.js:2');
  });

  it('labels the version as Retail when retail is true', () => {
    const url = buildIssueUrl({message: 'err'}, true);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain('Retail');
    expect(body).not.toContain('Shareware');
  });

  it('labels the version as Shareware when retail is false', () => {
    const url = buildIssueUrl({message: 'err'}, false);
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
    const url = buildIssueUrl({message: 'err'}, retail);
    const body = new URL(url).searchParams.get('body');
    expect(body).toContain(ORIGINAL_NAV_USER_AGENT);
  });
});
