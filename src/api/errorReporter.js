import React from 'react';

export const ExternalLink = ({children, ...props}) => (
  <a target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
);

export function buildIssueUrl(error, retail) {
  const message = (error.message || 'Unknown error') + (error.stack ? '\n' + error.stack : '');
  const url = new URL('https://github.com/d07RiV/diabloweb/issues/new');
  url.searchParams.set('body',
`**Description:**
[Please describe what you were doing before the error occurred]

**App version:**
DiabloWeb ${process.env.VERSION} (${retail ? 'Retail' : 'Shareware'})

**Error message:**
    
${message.split('\n').map(line => '    ' + line).join('\n')}

**User agent:**

    ${navigator.userAgent}

**Save file:**
[Please attach the save file, if applicable. The error box should have a link to download the current save you were playing; alternatively, use the Download button in the Manage Saves screen.]
`);
  return url.toString();
}
