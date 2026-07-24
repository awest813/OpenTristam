import React from 'react';
import compress from './compress';
import DialogFrame from '../ui/DialogFrame';
import LoadingScreen from '../ui/LoadingScreen';

export default class CompressMpq extends React.Component {
  state = {};
  fileInputRef = React.createRef();

  parseFile = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      this.start(files[0]);
    }
    e.target.value = '';
  };

  openFilePicker = () => {
    if (this.fileInputRef.current) {
      this.fileInputRef.current.click();
    }
  };

  onProgress(progress) {
    this.setState({ progress });
  }
  onDone = (blob) => {
    const url = URL.createObjectURL(blob);
    this.setState({ url, started: false, error: null });

    const lnk = document.createElement('a');
    lnk.setAttribute('href', url);
    lnk.setAttribute('download', 'DIABDAT.MPQ');
    document.body.appendChild(lnk);
    lnk.click();
    document.body.removeChild(lnk);
  };
  onError(message) {
    // Keep compression failures inside this dialog — escalating to the game
    // error overlay framed them as "Restart game", which is the wrong recovery.
    this.setState({
      started: false,
      progress: null,
      error: message || 'Compression failed.',
    });
  }

  onClose = () => {
    if (this.state.url) {
      URL.revokeObjectURL(this.state.url);
    }
    this.props.onClose();
  };

  clearError = () => {
    this.setState({ error: null });
  };

  start(file) {
    this.setState({ started: true, error: null, url: null });
    compress(file, (text, loaded, total) => this.onProgress({ text, loaded, total })).then(
      this.onDone,
      (e) => this.onError(e.message)
    );
  }

  renderTitle() {
    return (
      <div className="startTitle" aria-hidden="true">
        <span className="startTitleDeco">⚔</span>
        <span className="startTitleText">COMPRESS</span>
        <span className="startTitleDeco">⚔</span>
      </div>
    );
  }

  renderFileInput() {
    return (
      <input
        accept=".mpq"
        type="file"
        ref={this.fileInputRef}
        style={{ display: 'none' }}
        aria-label="Select MPQ file to compress"
        onChange={this.parseFile}
      />
    );
  }

  render() {
    const { url, started, progress, error } = this.state;
    if (error) {
      return (
        <DialogFrame className="start" ariaLabel="MPQ compression failed" onEscape={this.onClose}>
          {this.renderTitle()}
          <p className="compressErrorLead">Compression failed.</p>
          <p>{error}</p>
          <div className="dialogActions">
            <button
              type="button"
              className="startButton startButton--secondary"
              onClick={this.onClose}
            >
              Back
            </button>
            <button
              type="button"
              className="startButton startButton--primary"
              onClick={this.clearError}
            >
              Try again
            </button>
          </div>
        </DialogFrame>
      );
    }
    if (url) {
      return (
        <DialogFrame className="start" ariaLabel="MPQ compression complete" onEscape={this.onClose}>
          {this.renderTitle()}
          <p>
            Compression complete.{' '}
            <a href={url} download="DIABDAT.MPQ">
              Download DIABDAT.MPQ
            </a>{' '}
            if it doesn&apos;t start automatically.
          </p>
          <div className="dialogActions">
            <button
              type="button"
              className="startButton startButton--primary"
              onClick={this.onClose}
            >
              Back
            </button>
          </div>
        </DialogFrame>
      );
    }
    if (started) {
      const loadingProgress = { text: (progress && progress.text) || 'Processing...' };
      if (progress && progress.total) {
        loadingProgress.percent = Math.round((100 * progress.loaded) / progress.total);
      }
      return <LoadingScreen progress={loadingProgress} />;
    }
    return (
      <DialogFrame className="start" ariaLabel="Compress MPQ" onEscape={this.onClose}>
        {this.renderTitle()}
        <p>
          Reduce the original MPQ to about half its size by encoding sounds as MP3 and applying
          stronger compression. Select an MPQ file or drop it onto the page to begin.
        </p>
        <div className="dialogActions">
          <button
            type="button"
            className="startButton startButton--secondary"
            onClick={this.onClose}
          >
            Back
          </button>
          <button
            type="button"
            className="startButton startButton--primary"
            onClick={this.openFilePicker}
          >
            Select MPQ
          </button>
        </div>
        {this.renderFileInput()}
      </DialogFrame>
    );
  }
}
