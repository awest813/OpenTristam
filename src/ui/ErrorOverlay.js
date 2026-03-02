import React from 'react';
import { buildIssueUrl, ExternalLink } from '../api/errorReporter';

export default function ErrorOverlay({ error, retail, saveName }) {
  return (
    <ExternalLink className="error" href={buildIssueUrl(error, retail)}>
      <p className="header">The following error has occurred:</p>
      <p className="body">{error.message}</p>
      <p className="footer">Click to create an issue on GitHub</p>
      {error.save != null && <a href={error.save} download={saveName}>Download save file</a>}
    </ExternalLink>
  );
}
