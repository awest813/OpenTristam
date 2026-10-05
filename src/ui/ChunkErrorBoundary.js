import React from 'react';
import DialogFrame from './DialogFrame';

/**
 * Catches failures inside lazily loaded screens (Save Manager, MPQ
 * compressor). Without it, a chunk that fails to load — offline, or after a
 * redeploy removed the old hashed file — unmounts the whole React root and
 * leaves a blank page.
 */
export default class ChunkErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Failed to load screen:', error);
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }
    const { onClose, onReload = () => window.location.reload() } = this.props;
    return (
      <DialogFrame
        className="error"
        role="alertdialog"
        ariaLabel="Screen failed to load"
        onEscape={onClose}
        initialFocusSelector=".errorPrimaryActions .startButton--primary"
      >
        <p className="header">Couldn’t open this screen</p>
        <p className="errorLead">Part of the app didn’t load.</p>
        <p className="body">Check your connection, or reload the page to get the latest version.</p>
        <div className="errorPrimaryActions">
          <button type="button" className="startButton startButton--primary" onClick={onClose}>
            Back
          </button>
          <button type="button" className="startButton startButton--secondary" onClick={onReload}>
            Reload page
          </button>
        </div>
      </DialogFrame>
    );
  }
}
