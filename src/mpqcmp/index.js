import React from 'react';
import compress from './compress';
import DialogFrame from '../ui/DialogFrame';
import LoadingScreen from '../ui/LoadingScreen';

export default class CompressMpq extends React.Component {
  state = {};
  fileInputRef = React.createRef();

  parseFile = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      this.start(files[0]);
    }
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
    //const blob = new Blob([result], {type: 'binary/octet-stream'});
    const url = URL.createObjectURL(blob);
    this.setState({ url });

    const lnk = document.createElement('a');
    lnk.setAttribute('href', url);
    lnk.setAttribute('download', 'DIABDAT.MPQ');
    document.body.appendChild(lnk);
    lnk.click();
    document.body.removeChild(lnk);
  };
  onError(message, stack) {
    this.props.onClose();
    this.props.onError(message, stack);
  }

  onClose = () => {
    if (this.state.url) {
      URL.revokeObjectURL(this.state.url);
    }
    this.props.onClose();
  };

  start(file) {
    this.setState({ started: true });
    compress(file, (text, loaded, total) => this.onProgress({ text, loaded, total })).then(
      this.onDone,
      (e) => this.onError(e.message, e.stack)
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

  render() {
    const { url, started, progress } = this.state;
    if (url) {
      return (
        <DialogFrame className="start" ariaLabel="MPQ compression complete">
          {this.renderTitle()}
          <p>
            Compression complete.{' '}
            <a href={url} download="DIABDAT.MPQ">
              Download DIABDAT.MPQ
            </a>{' '}
            if it doesn&apos;t start automatically.
          </p>
          <div className="dialogActions">
            <button type="button" className="startButton" onClick={this.onClose}>
              Back
            </button>
          </div>
        </DialogFrame>
      );
    }
    if (started) {
      // Compression reports weighted bytes then file counts, so a byte readout
      // would be misleading — pass only the unified percent to the shared
      // loading screen for a consistent look.
      const loadingProgress = { text: (progress && progress.text) || 'Processing...' };
      if (progress && progress.total) {
        loadingProgress.percent = Math.round((100 * progress.loaded) / progress.total);
      }
      return <LoadingScreen progress={loadingProgress} />;
    }
    return (
      <DialogFrame className="start" ariaLabel="Compress MPQ">
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
          <button type="button" className="startButton" onClick={this.openFilePicker}>
            Select MPQ
          </button>
        </div>
        <input
          accept=".mpq"
          type="file"
          ref={this.fileInputRef}
          style={{ display: 'none' }}
          aria-label="Select MPQ file to compress"
          onChange={this.parseFile}
        />
      </DialogFrame>
    );
  }
}
