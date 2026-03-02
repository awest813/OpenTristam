import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload } from '@fortawesome/free-solid-svg-icons';
import getPlayerName from '../api/savefile';
import SessionContext from '../engine/sessionContext';

const PLAYER_CLASSES = ['Warrior', 'Rogue', 'Sorcerer'];

export default class SaveManager extends React.Component {
  static contextType = SessionContext;

  state = { saves: {} };
  lastSavesVersion = null;

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
      if (name.match(/\.sv$/i)) {
        saves[name] = getPlayerName(fsApi.files.get(name).buffer, name);
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

  render() {
    const {onClose} = this.getSessionValues();
    const { saves } = this.state;
    return (
      <div className="start">
        <ul className="saveList">
          {Object.entries(saves).map(([name, info]) => (
            <li key={name}>
              {name}
              {info && <span className="info">{info.name} (lv. {info.level} {PLAYER_CLASSES[info.cls] ?? 'Unknown'})</span>}
              <FontAwesomeIcon className="btnDownload" icon={faDownload} onClick={() => this.downloadSave(name)}/>
              <FontAwesomeIcon className="btnRemove" icon={faTimes} onClick={() => this.removeSave(name)}/>
            </li>
          ))}
        </ul>
        <form>
          <label htmlFor="saveFileInput" className="startButton">Upload Save</label>
          <input accept=".sv" type="file" id="saveFileInput" style={{display: 'none'}} onChange={this.uploadSave}/>
        </form>
        <div className="startButton" onClick={onClose || (() => {})}>Back</div>
      </div>
    );
  }
}
