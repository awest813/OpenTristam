import React from 'react';
import { ExternalLink } from '../api/errorReporter';
import { useSession } from '../engine/sessionContext';
import { TOUCH_LAYOUT_PRESETS, TOUCH_PAN_SENSITIVITIES } from '../preferences';
import DialogFrame from './DialogFrame';

const TOUCH_LAYOUT_LABELS = {
  default: 'Default',
  compact: 'Compact',
  thumb: 'Thumb reach',
};

const TOUCH_PAN_LABELS = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

export default function StartScreen(props) {
  const session = useSession();
  const hasSpawn = props.hasSpawn != null ? props.hasSpawn : session.hasSpawn;
  const hasSaves = props.hasSaves != null ? props.hasSaves : session.hasSaves;
  const onStart = props.onStart || session.startGame;
  const onShowSaves = props.onShowSaves || session.openSaveManager;
  const onCompress = props.onCompress || session.openCompressor;
  const touchLayoutPreset = props.touchLayoutPreset || session.touchLayoutPreset;
  const touchPanSensitivity = props.touchPanSensitivity || session.touchPanSensitivity;
  const onTouchLayoutPresetChange = props.onTouchLayoutPresetChange || session.setTouchLayoutPreset;
  const onTouchPanSensitivityChange =
    props.onTouchPanSensitivityChange || session.setTouchPanSensitivity;
  const isTouchDevice = props.isTouchDevice != null ? props.isTouchDevice : session.isTouchDevice;
  const showMobileOnboarding =
    props.showMobileOnboarding != null ? props.showMobileOnboarding : session.showMobileOnboarding;
  const onDismissMobileOnboarding =
    props.onDismissMobileOnboarding || session.dismissMobileOnboarding;
  const showTesterWelcome =
    props.showTesterWelcome != null ? props.showTesterWelcome : session.showTesterWelcome;
  const onDismissTesterWelcome = props.onDismissTesterWelcome || session.dismissTesterWelcome;
  const highContrastMode =
    props.highContrastMode != null ? props.highContrastMode : session.highContrastMode;
  const onHighContrastModeChange = props.onHighContrastModeChange || session.setHighContrastMode;
  const showInstallPrompt =
    props.showInstallPrompt != null ? props.showInstallPrompt : session.showInstallPrompt;
  const onInstallPrompt = props.onInstallPrompt || session.triggerInstallPrompt;
  const onDismissInstallPrompt = props.onDismissInstallPrompt || session.dismissInstallPrompt;
  const mpqInputRef = React.useRef(null);

  const openMpqPicker = () => {
    if (mpqInputRef.current) {
      mpqInputRef.current.click();
    }
  };

  return (
    <DialogFrame
      className="start"
      ariaLabel="OpenTristam — start game"
      initialFocusSelector=".startButton--primary"
    >
      <header className="startHeader">
        <div className="startTitle" aria-hidden="true">
          <span className="startTitleDeco">⚔</span>
          <span className="startTitleText">DIABLO</span>
          <span className="startTitleDeco">⚔</span>
        </div>
        <p className="startBrand">OpenTristam</p>
      </header>

      {showTesterWelcome && (
        <div className="testerWelcome" role="note" aria-live="polite">
          <div className="testerWelcomeTitle">Testing this build</div>
          <p className="testerWelcomeLead">
            Quick checks: confirm the game loads, audio and input feel right, and saves stick after
            a refresh.
          </p>
          <ul className="testerWelcomeList">
            <li>
              <strong>Fastest path:</strong> use <strong>Play Shareware</strong>—no files needed
              (first launch may download data).
            </li>
            <li>
              <strong>Retail:</strong> you need <strong>DIABDAT.MPQ</strong> from a copy you own (
              <ExternalLink href="https://www.gog.com/game/diablo">GoG</ExternalLink>
              ). Drag it onto the page or use <strong>Select MPQ</strong>.
            </li>
            <li>
              <strong>Saves:</strong> stored in this browser. After a character exists, use{' '}
              <strong>Manage Saves</strong> to export or clean up.
            </li>
          </ul>
          <button type="button" className="linkButton" onClick={onDismissTesterWelcome}>
            Got it, hide this panel
          </button>
        </div>
      )}

      <p className="startMeta">
        Browser port of the reconstructed engine (
        <ExternalLink href="https://github.com/awest813/OpenTristam">GitHub</ExternalLink>
        ). Not affiliated with Blizzard.
      </p>

      <div className="startQuickPaths" aria-label="Ways to start">
        <div className="startPathCard startPathCard--primary">
          <div className="startPathCardLabel">Fastest try</div>
          <h2 className="startPathCardTitle">Shareware</h2>
          <p className="startPathCardDesc">
            {hasSpawn
              ? 'Shareware data is already cached in this browser.'
              : 'Downloads shareware data on first launch (~50 MB).'}
          </p>
          <button
            type="button"
            className="startButton startButton--primary startPathCardCta"
            data-initial-focus
            onClick={() => onStart(null)}
          >
            Play Shareware
          </button>
        </div>
        <div className="startPathCard">
          <div className="startPathCardLabel">Full game</div>
          <h2 className="startPathCardTitle">Retail MPQ</h2>
          <p className="startPathCardDesc">
            Select <strong>DIABDAT.MPQ</strong> or drop it anywhere on the page.{' '}
            <button type="button" className="linkButton" onClick={onCompress}>
              Compress the MPQ
            </button>{' '}
            for a smaller file.
          </p>
          <button type="button" className="startButton startPathCardCta" onClick={openMpqPicker}>
            Select MPQ
          </button>
        </div>
      </div>
      <input
        accept=".mpq"
        type="file"
        ref={mpqInputRef}
        style={{ display: 'none' }}
        aria-label="Select MPQ file"
        onChange={(e) => {
          const { files } = e.target;
          if (files && files.length > 0) onStart(files[0]);
          e.target.value = '';
        }}
      />

      {showMobileOnboarding && (
        <div className="mobileOnboarding" role="note" aria-live="polite">
          <div className="mobileOnboardingTitle">Mobile tip</div>
          <p className="mobileOnboardingLead">
            Use <strong>Play Shareware</strong> for an immediate try, or <strong>Select MPQ</strong>{' '}
            to import retail data from device storage. Open <strong>Settings</strong> below to tune
            touch layout before you start.
          </p>
          <button type="button" className="linkButton" onClick={onDismissMobileOnboarding}>
            Got it
          </button>
        </div>
      )}

      <details className="startSettings">
        <summary className="startSettingsSummary">Settings</summary>
        <div className="startSettingsBody">
          {isTouchDevice && (
            <div className="touchSettings" role="group" aria-label="Touch settings">
              <div className="touchSettingsTitle">Touch</div>
              <label className="touchSettingsRow">
                <span>Layout preset</span>
                <select
                  value={touchLayoutPreset}
                  onChange={(event) => onTouchLayoutPresetChange(event.target.value)}
                  onBlur={(event) => onTouchLayoutPresetChange(event.target.value)}
                >
                  {TOUCH_LAYOUT_PRESETS.map((value) => (
                    <option key={value} value={value}>
                      {TOUCH_LAYOUT_LABELS[value] || value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="touchSettingsRow">
                <span>Pan sensitivity</span>
                <select
                  value={touchPanSensitivity}
                  onChange={(event) => onTouchPanSensitivityChange(event.target.value)}
                  onBlur={(event) => onTouchPanSensitivityChange(event.target.value)}
                >
                  {TOUCH_PAN_SENSITIVITIES.map((value) => (
                    <option key={value} value={value}>
                      {TOUCH_PAN_LABELS[value] || value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="displaySettings" role="group" aria-label="Display settings">
            <div className="displaySettingsTitle">Display</div>
            <label className="displaySettingsRow">
              <input
                type="checkbox"
                checked={highContrastMode}
                onChange={(event) => onHighContrastModeChange(event.target.checked)}
              />
              <span>High-contrast UI mode</span>
            </label>
          </div>
        </div>
      </details>

      {(hasSaves || showInstallPrompt) && (
        <div className="startFooter">
          {hasSaves && (
            <div className="startActions">
              <button
                type="button"
                className="startButton startButton--secondary"
                onClick={onShowSaves}
              >
                Manage Saves
              </button>
            </div>
          )}

          {showInstallPrompt && (
            <div className="installPromptSection" role="complementary" aria-label="Install app">
              <button
                type="button"
                className="startButton startButton--install"
                onClick={onInstallPrompt}
              >
                Install App
              </button>
              <button
                type="button"
                className="installPromptDismiss"
                onClick={onDismissInstallPrompt}
                aria-label="Dismiss install prompt"
              >
                Not now
              </button>
            </div>
          )}
        </div>
      )}
    </DialogFrame>
  );
}
