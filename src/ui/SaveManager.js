import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload, faCheck } from '@fortawesome/free-solid-svg-icons';
import getPlayerName from '../api/savefile';
import SessionContext from '../engine/sessionContext';
import DialogFrame from './DialogFrame';

const PLAYER_CLASSES = ['Warrior', 'Rogue', 'Sorcerer'];

export default class SaveManager extends React.Component {
  static contextType = SessionContext;

  state = { saves: {}, pendingDelete: null, busy: false };
  lastSavesVersion = null;
  uploadInputRef = React.createRef();
  confirmButtonRef = React.createRef();

  getSessionValues() {
    return {
      fs: this.props.fs || this.context.fs,
      savesVersion:
        this.props.savesVersion != null ? this.props.savesVersion : this.context.savesVersion,
      onClose: this.props.onClose || this.context.closeSaveManager,
      showNotice: this.props.showNotice || this.context.showNotice,
      onSavesChanged: this.props.onSavesChanged || this.context.refreshSaves,
    };
  }

  notify(notice) {
    const { showNotice } = this.getSessionValues();
    if (typeof showNotice === 'function') {
      showNotice(notice);
    }
  }

  notifySavesChanged() {
    const { onSavesChanged } = this.getSessionValues();
    if (typeof onSavesChanged === 'function') {
      onSavesChanged();
    }
  }

  componentDidMount() {
    this.lastSavesVersion = this.getSessionValues().savesVersion;
    this.loadSaves();
  }

  componentDidUpdate(prevProps, prevState) {
    const { savesVersion } = this.getSessionValues();
    if (savesVersion !== this.lastSavesVersion) {
      this.lastSavesVersion = savesVersion;
      this.loadSaves();
    }
    // Move focus onto the confirmation control as it appears so keyboard users
    // land on the destructive choice rather than losing their place.
    if (
      this.state.pendingDelete &&
      this.state.pendingDelete !== prevState.pendingDelete &&
      this.confirmButtonRef.current
    ) {
      this.confirmButtonRef.current.focus();
    }
  }

  async loadSaves() {
    const { fs } = this.getSessionValues();
    if (!fs) {
      this.setState({ saves: {} });
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

  requestRemoveSave = (name) => {
    if (this.state.busy) return;
    this.setState({ pendingDelete: name });
  };

  cancelRemoveSave = () => {
    this.setState({ pendingDelete: null });
  };

  confirmRemoveSave = async (name) => {
    if (this.state.busy) return;
    this.setState({ pendingDelete: null, busy: true });
    const { fs } = this.getSessionValues();
    if (!fs) {
      this.setState({ busy: false });
      return;
    }
    try {
      const fsApi = await fs;
      await fsApi.delete(name.toLowerCase());
      await this.loadSaves();
      this.notifySavesChanged();
      this.notify({ tone: 'success', message: `Deleted “${name}”.` });
    } catch (_e) {
      this.notify({
        tone: 'error',
        message: `Couldn’t delete “${name}”. Browser storage may be unavailable.`,
      });
      await this.loadSaves();
    } finally {
      this.setState({ busy: false });
    }
  };

  onConfirmKeyDown = (event) => {
    // Cancel the pending delete on Escape without bubbling up to DialogFrame,
    // which would otherwise close the whole Save Manager.
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancelRemoveSave();
    }
  };

  downloadSave = async (name) => {
    if (this.state.busy) return;
    const { fs } = this.getSessionValues();
    if (!fs) return;
    try {
      const fsApi = await fs;
      await fsApi.download(name);
    } catch (_e) {
      this.notify({
        tone: 'error',
        message: `Couldn’t download “${name}”. The file may be missing or storage is unavailable.`,
      });
    }
  };

  uploadSave = async (e) => {
    const input = e.target;
    const file = input.files && input.files[0];
    // Reset so the same file can be chosen again after a failure/success.
    input.value = '';
    if (!file || this.state.busy) {
      return;
    }
    if (!/\.sv$/i.test(file.name)) {
      this.notify({
        tone: 'error',
        message: `“${file.name}” isn’t a .sv save file.`,
      });
      return;
    }

    const { fs } = this.getSessionValues();
    if (!fs) return;

    this.setState({ busy: true });
    try {
      const fsApi = await fs;
      await fsApi.upload(file);
      await this.loadSaves();
      this.notifySavesChanged();
      const info = getPlayerName(fsApi.files.get(file.name.toLowerCase()), file.name);
      if (info) {
        this.notify({ tone: 'success', message: `Imported “${file.name}”.` });
      } else {
        this.notify({
          tone: 'info',
          message: `Imported “${file.name}”, but hero data couldn’t be read. The file may be damaged.`,
        });
      }
    } catch (_e) {
      this.notify({
        tone: 'error',
        message: `Couldn’t import “${file.name}”. Make sure it’s a valid .sv save file.`,
      });
    } finally {
      this.setState({ busy: false });
    }
  };

  openUploadPicker = () => {
    if (this.state.busy) return;
    if (this.uploadInputRef.current) {
      this.uploadInputRef.current.click();
    }
  };

  render() {
    const { onClose } = this.getSessionValues();
    const { saves, pendingDelete, busy } = this.state;
    const saveEntries = Object.entries(saves);
    return (
      <DialogFrame
        className="start saveManager"
        ariaLabel="Manage saves"
        onEscape={onClose || (() => {})}
      >
        <div className="startTitle" aria-hidden="true">
          <span className="startTitleDeco">⚔</span>
          <span className="startTitleText">SAVES</span>
          <span className="startTitleDeco">⚔</span>
        </div>
        <p className="saveManagerIntro">
          Keep a backup of your browser saves or import an existing <strong>.sv</strong> file.
        </p>
        {saveEntries.length === 0 ? (
          <div className="savesEmpty">
            <p className="savesEmptyTitle">No save files found.</p>
            <p className="savesEmptyBody">
              Start a new game to create one, or import an existing .sv save file.
            </p>
            <button
              type="button"
              className="startButton savesEmptyCta"
              onClick={this.openUploadPicker}
              disabled={busy}
            >
              Upload a save
            </button>
          </div>
        ) : (
          <ul className="saveList">
            {saveEntries.map(([name, info]) => (
              <li key={name}>
                <div className="saveListMeta">
                  <span className="saveName">{name}</span>
                  {info ? (
                    <span className="info">
                      {info.name} (lv. {info.level} {PLAYER_CLASSES[info.cls] ?? 'Unknown'})
                    </span>
                  ) : (
                    <span className="info saveMetaUnknown">Hero data unavailable</span>
                  )}
                </div>
                {pendingDelete === name ? (
                  <div className="saveConfirm" role="group" aria-label={`Confirm deleting ${name}`}>
                    <span className="saveConfirmText">Delete?</span>
                    <button
                      type="button"
                      ref={this.confirmButtonRef}
                      className="saveIconButton btnConfirmDelete"
                      onClick={() => this.confirmRemoveSave(name)}
                      onKeyDown={this.onConfirmKeyDown}
                      disabled={busy}
                      aria-label={`Confirm deleting ${name}`}
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      <span className="saveIconButtonLabel">Yes</span>
                    </button>
                    <button
                      type="button"
                      className="saveIconButton btnCancelDelete"
                      onClick={this.cancelRemoveSave}
                      onKeyDown={this.onConfirmKeyDown}
                      disabled={busy}
                      aria-label={`Cancel deleting ${name}`}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                      <span className="saveIconButtonLabel">No</span>
                    </button>
                  </div>
                ) : (
                  <div className="saveListActions">
                    <button
                      type="button"
                      className="saveIconButton btnDownload"
                      onClick={() => this.downloadSave(name)}
                      disabled={busy}
                      aria-label={`Download ${name}`}
                      title={`Download ${name}`}
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      <span className="saveIconButtonLabel">Download</span>
                    </button>
                    <button
                      type="button"
                      className="saveIconButton btnRemove"
                      onClick={() => this.requestRemoveSave(name)}
                      disabled={busy}
                      aria-label={`Delete ${name}`}
                      title={`Delete ${name}`}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                      <span className="saveIconButtonLabel">Delete</span>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="saveManagerActions">
          <button
            type="button"
            className="startButton startButton--secondary"
            onClick={onClose || (() => {})}
          >
            Back
          </button>
          <button
            type="button"
            className="startButton"
            onClick={this.openUploadPicker}
            disabled={busy}
          >
            Upload Save
          </button>
        </div>
        <input
          accept=".sv"
          type="file"
          ref={this.uploadInputRef}
          style={{ display: 'none' }}
          aria-label="Select save file to upload"
          onChange={this.uploadSave}
        />
      </DialogFrame>
    );
  }
}
