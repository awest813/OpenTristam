import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload } from '@fortawesome/free-solid-svg-icons';
import getPlayerName from '../api/savefile';

const PLAYER_CLASSES = ['Warrior', 'Rogue', 'Sorcerer'];

export default class SaveManager extends React.Component {
  state = { saves: {} };

  componentDidMount() {
    this.loadSaves();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.savesVersion !== this.props.savesVersion) {
      this.loadSaves();
    }
  }

  async loadSaves() {
    const fs = await this.props.fs;
    const saves = {};
    for (const name of fs.files.keys()) {
      if (name.match(/\.sv$/i)) {
        saves[name] = getPlayerName(fs.files.get(name).buffer, name);
      }
    }
    this.setState({ saves });
  }

  removeSave = async name => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    const fs = await this.props.fs;
    await fs.delete(name.toLowerCase());
    fs.files.delete(name.toLowerCase());
    this.loadSaves();
  }

  downloadSave = name => {
    this.props.fs.then(fs => fs.download(name));
  }

  uploadSave = e => {
    const file = e.target.files[0];
    if (file) {
      this.props.fs.then(fs => fs.upload(file)).then(() => this.loadSaves());
    }
  }

  render() {
    const { onClose } = this.props;
    const { saves } = this.state;
    return (
      <div className="start">
        <ul className="saveList">
          {Object.entries(saves).map(([name, info]) => (
            <li key={name}>
              {name}
              {info && <span className="info">{info.name} (lv. {info.level} {PLAYER_CLASSES[info.cls]})</span>}
              <FontAwesomeIcon className="btnDownload" icon={faDownload} onClick={() => this.downloadSave(name)}/>
              <FontAwesomeIcon className="btnRemove" icon={faTimes} onClick={() => this.removeSave(name)}/>
            </li>
          ))}
        </ul>
        <form>
          <label htmlFor="saveFileInput" className="startButton">Upload Save</label>
          <input accept=".sv" type="file" id="saveFileInput" style={{display: 'none'}} onChange={this.uploadSave}/>
        </form>
        <div className="startButton" onClick={onClose}>Back</div>
      </div>
    );
  }
}
