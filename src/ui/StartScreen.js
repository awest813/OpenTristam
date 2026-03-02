import React from 'react';
import { ExternalLink } from '../api/errorReporter';

export default function StartScreen({ hasSpawn, hasSaves, onStart, onShowSaves, onCompress }) {
  return (
    <div className="start">
      <p>
        This is a web port of the original Diablo game, based on source code reconstructed by
        GalaXyHaXz and devilution team. The project page with information and links can be found over here{' '}
        <ExternalLink href="https://github.com/d07RiV/diabloweb">https://github.com/d07RiV/diabloweb</ExternalLink>
      </p>
      <p>
        If you own the original game, you can drop the original DIABDAT.MPQ onto this page or click the button below to start playing.
        The game can be purchased from <ExternalLink href="https://www.gog.com/game/diablo">GoG</ExternalLink>.
        {' '}<span className="link" onClick={onCompress}>Click here to compress the MPQ, greatly reducing its size.</span>
      </p>
      {!hasSpawn && (
        <p>Or you can play the shareware version for free (50MB download).</p>
      )}
      <form>
        <label htmlFor="mpqFileInput" className="startButton">Select MPQ</label>
        <input
          accept=".mpq"
          type="file"
          id="mpqFileInput"
          style={{display: 'none'}}
          onChange={e => {
            const {files} = e.target;
            if (files.length > 0) onStart(files[0]);
          }}
        />
      </form>
      <div className="startButton" onClick={() => onStart(null)}>Play Shareware</div>
      {hasSaves && <div className="startButton" onClick={onShowSaves}>Manage Saves</div>}
    </div>
  );
}
