import React from 'react';

export default function LoadingScreen({ progress }) {
  return (
    <div className="loading">
      {(progress && progress.text) || 'Loading...'}
      {progress != null && !!progress.total && (
        <span className="progressBar">
          <span>
            <span style={{width: `${Math.round(100 * progress.loaded / progress.total)}%`}}/>
          </span>
        </span>
      )}
    </div>
  );
}
