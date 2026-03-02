import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  normalizePreferences,
  savePreferences,
} from './preferences';

describe('preferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normalizes invalid values to defaults', () => {
    const normalized = normalizePreferences({
      touchLayoutPreset: 'unknown',
      touchPanSensitivity: 'hyper',
      mobileOnboardingDismissed: 'yes',
    });

    expect(normalized).toEqual({
      touchLayoutPreset: 'default',
      touchPanSensitivity: 'normal',
      mobileOnboardingDismissed: true,
    });
  });

  it('loads defaults when no preferences exist', () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('persists and merges preference updates', () => {
    savePreferences({touchLayoutPreset: 'thumb'});
    savePreferences({touchPanSensitivity: 'high', mobileOnboardingDismissed: true});

    expect(loadPreferences()).toEqual({
      touchLayoutPreset: 'thumb',
      touchPanSensitivity: 'high',
      mobileOnboardingDismissed: true,
    });
  });

  it('falls back to defaults when stored JSON is invalid', () => {
    window.localStorage.setItem('diabloweb.preferences.v1', '{bad json');

    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
});
