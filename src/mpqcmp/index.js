import React from 'react';
import compress from './compress';
import DialogFrame from '../ui/DialogFrame';

export default class CompressMpq extends React.Component {
  state = {};
  fileInputRef = React.createRef();

  parseFile = e => {
    const files = e.target.files;
    if (files.length > 0) {
      this.start(files[0]);
    }
  }

  openFilePicker = () => {
    if (this.fileInputRef.current) {
      this.fileInputRef.current.click();
    }
  }

  onProgress(progress) {
    this.setState({progress});
  }
  onDone = blob => {
    //const blob = new Blob([result], {type: 'binary/octet-stream'});
    const url = URL.createObjectURL(blob);
    this.setState({url});

    const lnk = document.createElement('a');
    lnk.setAttribute('href', url);
    lnk.setAttribute('download', 'DIABDAT.MPQ');
    document.body.appendChild(lnk);
    lnk.click();
    document.body.removeChild(lnk);
  }
  onError(message, stack) {
    this.props.onClose();
    this.props.onError(message, stack);
  }

  onClose = () => {
    if (this.state.url) {
      URL.revokeObjectURL(this.state.url);
    }
    this.props.onClose();
  }

  start(file) {
    this.setState({started: true});
    compress(file, (text, loaded, total) => this.onProgress({text, loaded, total}))
      .then(this.onDone, e => this.onError(e.message, e.stack));
  }

  render() {
    const { url, started, progress } = this.state;
    if (url) {
      return (
        <DialogFrame className="start" ariaLabel="MPQ compression complete">
          <p>
            <a href={url} download="DIABDAT.MPQ">Download DIABDAT.MPQ</a> if it doesn&apos;t start automatically.
          </p>
          <button type="button" className="startButton" onClick={this.onClose}>Back</button>
        </DialogFrame>
      );
    }
    if (started) {
      return (
        <div className="loading" role="status" aria-live="polite" aria-atomic="true">
          {(progress && progress.text) || 'Processing...'}
          {progress != null && !!progress.total && (
            <span className="progressBar">
              <span>
                <span
                  style={{width: `${Math.round(100 * progress.loaded / progress.total)}%`}}
                  role="progressbar"
                  aria-label="Compression progress"
                  aria-valuenow={Math.round(100 * progress.loaded / progress.total)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </span>
            </span>
          )}
        </div>
      );
    }
    return (
      <DialogFrame className="start" ariaLabel="Compress MPQ">
        <p>
          You can use this tool to reduce the original MPQ to about half its size. It encodes sounds in MP3 format and uses better compression for regular files.
          To begin, select an MPQ or drop the MPQ onto the page.
        </p>
        <button type="button" className="startButton" onClick={this.openFilePicker}>Select MPQ</button>
        <input accept=".mpq" type="file" ref={this.fileInputRef} style={{display: "none"}} aria-label="Select MPQ file to compress" onChange={this.parseFile}/>
        <button type="button" className="startButton" onClick={this.onClose}>Back</button>
      </DialogFrame>
    );
  }
}
