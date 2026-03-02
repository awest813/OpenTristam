import React from 'react';
import { ExternalLink } from '../api/errorReporter';
import { useSession } from '../engine/sessionContext';
import DialogFrame from './DialogFrame';

export default function StartScreen(props) {
  const session = useSession();
  const hasSpawn = props.hasSpawn != null ? props.hasSpawn : session.hasSpawn;
  const hasSaves = props.hasSaves != null ? props.hasSaves : session.hasSaves;
  const onStart = props.onStart || session.startGame;
  const onShowSaves = props.onShowSaves || session.openSaveManager;
  const onCompress = props.onCompress || session.openCompressor;
  const mpqInputRef = React.useRef(null);

  const openMpqPicker = () => {
    if (mpqInputRef.current) {
      mpqInputRef.current.click();
    }
  };

  return (
    <DialogFrame className="start" ariaLabel="Start Diablo">
      <p>
        This is a web port of the original Diablo game, based on source code reconstructed by
        GalaXyHaXz and devilution team. The project page with information and links can be found over here{' '}
        <ExternalLink href="https://github.com/d07RiV/diabloweb">https://github.com/d07RiV/diabloweb</ExternalLink>
      </p>
      <p>
        If you own the original game, you can drop the original DIABDAT.MPQ onto this page or click the button below to start playing.
        The game can be purchased from <ExternalLink href="https://www.gog.com/game/diablo">GoG</ExternalLink>.
        {' '}
        <button type="button" className="linkButton" onClick={onCompress}>
          Click here to compress the MPQ, greatly reducing its size.
        </button>
      </p>
      {!hasSpawn && (
        <p>Or you can play the shareware version for free (50MB download).</p>
      )}
      <button type="button" className="startButton" onClick={openMpqPicker}>Select MPQ</button>
      <input
        accept=".mpq"
        type="file"
        ref={mpqInputRef}
        style={{display: 'none'}}
        onChange={e => {
          const {files} = e.target;
          if (files.length > 0) onStart(files[0]);
        }}
      />
      <button type="button" className="startButton" onClick={() => onStart(null)}>Play Shareware</button>
      {hasSaves && <button type="button" className="startButton" onClick={onShowSaves}>Manage Saves</button>}
    </DialogFrame>
  );
}
