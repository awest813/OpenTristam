import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload } from '@fortawesome/free-solid-svg-icons';
import getPlayerName from '../api/savefile';
import SessionContext from '../engine/sessionContext';
import DialogFrame from './DialogFrame';

const PLAYER_CLASSES = ['Warrior', 'Rogue', 'Sorcerer'];

export default class SaveManager extends React.Component {
  static contextType = SessionContext;

  state = { saves: {} };
  lastSavesVersion = null;
  uploadInputRef = React.createRef();

  getSessionValues() {
    return {
      fs: this.props.fs || this.context.fs,
      savesVersion: this.props.savesVersion != null ? this.props.savesVersion : this.context.savesVersion,
      onClose: this.props.onClose || this.context.closeSaveManager,
    };
  }

  componentDidMount() {
    this.lastSavesVersion = this.getSessionValues().savesVersion;
    this.loadSaves();
  }

  componentDidUpdate() {
    const {savesVersion} = this.getSessionValues();
    if (savesVersion !== this.lastSavesVersion) {
      this.lastSavesVersion = savesVersion;
      this.loadSaves();
    }
  }

  async loadSaves() {
    const {fs} = this.getSessionValues();
    if (!fs) {
      this.setState({saves: {}});
      return;
    }

    const fsApi = await fs;
    const saves = {};
    for (const name of fsApi.files.keys()) {
      if (/\.sv$/i.test(name)) {
        saves[name] = getPlayerName(fsApi.files.get(name), name);
      }
    }
    this.setState({ saves });
  }

  removeSave = async name => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    const {fs} = this.getSessionValues();
    if (!fs) return;
    const fsApi = await fs;
    await fsApi.delete(name.toLowerCase());
    fsApi.files.delete(name.toLowerCase());
    this.loadSaves();
  }

  downloadSave = name => {
    const {fs} = this.getSessionValues();
    if (!fs) return;
    fs.then(fsApi => fsApi.download(name));
  }

  uploadSave = e => {
    const file = e.target.files[0];
    if (file) {
      const {fs} = this.getSessionValues();
      if (!fs) return;
      fs.then(fsApi => fsApi.upload(file)).then(() => this.loadSaves());
    }
  }

  openUploadPicker = () => {
    if (this.uploadInputRef.current) {
      this.uploadInputRef.current.click();
    }
  }

  render() {
    const {onClose} = this.getSessionValues();
    const { saves } = this.state;
    const saveEntries = Object.entries(saves);
    return (
      <DialogFrame className="start" ariaLabel="Manage saves">
        {saveEntries.length === 0 ? (
          <p className="savesEmpty">No save files found.</p>
        ) : (
          <ul className="saveList">
            {saveEntries.map(([name, info]) => (
              <li key={name}>
                {name}
                {info && <span className="info">{info.name} (lv. {info.level} {PLAYER_CLASSES[info.cls] ?? 'Unknown'})</span>}
                <button
                  type="button"
                  className="saveIconButton btnDownload"
                  onClick={() => this.downloadSave(name)}
                  aria-label={`Download ${name}`}
                  title={`Download ${name}`}
                >
                  <FontAwesomeIcon icon={faDownload}/>
                </button>
                <button
                  type="button"
                  className="saveIconButton btnRemove"
                  onClick={() => this.removeSave(name)}
                  aria-label={`Delete ${name}`}
                  title={`Delete ${name}`}
                >
                  <FontAwesomeIcon icon={faTimes}/>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="startButton" onClick={this.openUploadPicker}>Upload Save</button>
        <input accept=".sv" type="file" ref={this.uploadInputRef} style={{display: 'none'}} aria-label="Select save file to upload" onChange={this.uploadSave}/>
        <button type="button" className="startButton" onClick={onClose || (() => {})}>Back</button>
      </DialogFrame>
    );
  }
}
