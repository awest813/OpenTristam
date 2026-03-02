export const TOUCH_LAYOUT_PRESETS = ['default', 'compact', 'thumb'];
export const TOUCH_PAN_SENSITIVITIES = ['low', 'normal', 'high'];

export const DEFAULT_TOUCH_LAYOUT_PRESET = 'default';
export const DEFAULT_TOUCH_PAN_SENSITIVITY = 'normal';

export const DEFAULT_PREFERENCES = {
  touchLayoutPreset: DEFAULT_TOUCH_LAYOUT_PRESET,
  touchPanSensitivity: DEFAULT_TOUCH_PAN_SENSITIVITY,
  mobileOnboardingDismissed: false,
};

const STORAGE_KEY = 'diabloweb.preferences.v1';

function getStorage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

function sanitizeTouchLayoutPreset(value) {
  return TOUCH_LAYOUT_PRESETS.includes(value) ? value : DEFAULT_TOUCH_LAYOUT_PRESET;
}

function sanitizeTouchPanSensitivity(value) {
  return TOUCH_PAN_SENSITIVITIES.includes(value) ? value : DEFAULT_TOUCH_PAN_SENSITIVITY;
}

function sanitizeMobileOnboardingDismissed(value) {
  return Boolean(value);
}

export function normalizePreferences(raw = {}) {
  return {
    touchLayoutPreset: sanitizeTouchLayoutPreset(raw.touchLayoutPreset),
    touchPanSensitivity: sanitizeTouchPanSensitivity(raw.touchPanSensitivity),
    mobileOnboardingDismissed: sanitizeMobileOnboardingDismissed(raw.mobileOnboardingDismissed),
  };
}

export function loadPreferences() {
  const storage = getStorage();
  if (!storage) {
    return {...DEFAULT_PREFERENCES};
  }

  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (!stored) {
      return {...DEFAULT_PREFERENCES};
    }
    return normalizePreferences(JSON.parse(stored));
  } catch (e) {
    return {...DEFAULT_PREFERENCES};
  }
}

export function savePreferences(updates = {}) {
  const storage = getStorage();
  const current = loadPreferences();
  const next = {
    ...current,
    ...normalizePreferences({...current, ...updates}),
  };

  if (!storage) {
    return next;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
  }
  return next;
}
