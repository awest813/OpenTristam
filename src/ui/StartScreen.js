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
  const onTouchPanSensitivityChange = props.onTouchPanSensitivityChange || session.setTouchPanSensitivity;
  const isTouchDevice = props.isTouchDevice != null ? props.isTouchDevice : session.isTouchDevice;
  const showMobileOnboarding = props.showMobileOnboarding != null ? props.showMobileOnboarding : session.showMobileOnboarding;
  const onDismissMobileOnboarding = props.onDismissMobileOnboarding || session.dismissMobileOnboarding;
  const highContrastMode = props.highContrastMode != null ? props.highContrastMode : session.highContrastMode;
  const onHighContrastModeChange = props.onHighContrastModeChange || session.setHighContrastMode;
  const mpqInputRef = React.useRef(null);

  const openMpqPicker = () => {
    if (mpqInputRef.current) {
      mpqInputRef.current.click();
    }
  };

  return (
    <DialogFrame className="start" ariaLabel="Start Diablo">
      <div className="startTitle" aria-hidden="true">
        <span className="startTitleDeco">⚔</span>
        <span className="startTitleText">DIABLO</span>
        <span className="startTitleDeco">⚔</span>
      </div>
      <p>
        This is a web port of the original Diablo game, based on source code reconstructed by
        GalaXyHaXz and devilution team. The project page with information and links can be found over here{' '}
        <ExternalLink href="https://github.com/d07RiV/diabloweb">https://github.com/d07RiV/diabloweb</ExternalLink>
      </p>
      <p>
        If you own the original game, you can drop the original DIABDAT.MPQ onto this page or select an MPQ file to start playing.
        The game can be purchased from <ExternalLink href="https://www.gog.com/game/diablo">GoG</ExternalLink>.
        {' '}
        <button type="button" className="linkButton" onClick={onCompress}>
          Compress the MPQ
        </button>
        {' '}to greatly reduce its size.
      </p>
      {showMobileOnboarding && (
        <div className="mobileOnboarding" role="note" aria-live="polite">
          <div className="mobileOnboardingTitle">Mobile Quick Start</div>
          <ul>
            <li>Tap <strong>Select MPQ</strong> to import your retail MPQ file from device storage.</li>
            <li>Use <strong>Play Shareware</strong> for immediate play without importing files.</li>
            <li>Touch controls appear when you start playing; customize layout below.</li>
          </ul>
          <button type="button" className="linkButton" onClick={onDismissMobileOnboarding}>
            Got it
          </button>
        </div>
      )}
      {isTouchDevice && (
        <div className="touchSettings" role="group" aria-label="Touch settings">
          <div className="touchSettingsTitle">Touch Settings</div>
          <label className="touchSettingsRow">
            <span>Layout preset</span>
            <select
              value={touchLayoutPreset}
              onChange={event => onTouchLayoutPresetChange(event.target.value)}
              onBlur={event => onTouchLayoutPresetChange(event.target.value)}
            >
              {TOUCH_LAYOUT_PRESETS.map(value => (
                <option key={value} value={value}>{TOUCH_LAYOUT_LABELS[value] || value}</option>
              ))}
            </select>
          </label>
          <label className="touchSettingsRow">
            <span>Pan sensitivity</span>
            <select
              value={touchPanSensitivity}
              onChange={event => onTouchPanSensitivityChange(event.target.value)}
              onBlur={event => onTouchPanSensitivityChange(event.target.value)}
            >
              {TOUCH_PAN_SENSITIVITIES.map(value => (
                <option key={value} value={value}>{TOUCH_PAN_LABELS[value] || value}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="displaySettings" role="group" aria-label="Display settings">
        <div className="displaySettingsTitle">Display Settings</div>
        <label className="displaySettingsRow">
          <input
            type="checkbox"
            checked={highContrastMode}
            onChange={event => onHighContrastModeChange(event.target.checked)}
          />
          <span>High-contrast UI mode</span>
        </label>
      </div>
      {!hasSpawn && (
        <p>Or you can play the shareware version for free (50MB download).</p>
      )}
      <div className="startActions">
        <button type="button" className="startButton startButton--primary" onClick={openMpqPicker}>Select MPQ</button>
        <input
          accept=".mpq"
          type="file"
          ref={mpqInputRef}
          style={{display: 'none'}}
          aria-label="Select MPQ file"
          onChange={e => {
            const {files} = e.target;
            if (files && files.length > 0) onStart(files[0]);
          }}
        />
        <button type="button" className="startButton" onClick={() => onStart(null)}>Play Shareware</button>
        {hasSaves && <button type="button" className="startButton startButton--secondary" onClick={onShowSaves}>Manage Saves</button>}
      </div>
    </DialogFrame>
  );
}
