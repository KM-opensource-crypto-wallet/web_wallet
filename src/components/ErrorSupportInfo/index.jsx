'use client';
import React, {useEffect, useState} from 'react';
import {getContactUsEmail} from 'whitelabel/whiteLabelInfo';
import {getSupportId} from 'services/logger';
import {
  getSupportTelegramUrl,
  openSupportEmail,
  openSupportTelegram,
} from 'utils/contactSupport';

const linkStyle = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: '#0000EE',
  textDecoration: 'underline',
  cursor: 'pointer',
  font: 'inherit',
};

// Contact links and the Support ID on the crash screens (app/error.jsx,
// app/global-error.jsx), like the mobile ErrorComponent. Inline styles because
// global-error renders without the root layout. Read after mount: the Support
// ID only exists in the browser.
const ErrorSupportInfo = () => {
  const [contact, setContact] = useState(null);
  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() =>
      setContact({
        supportId: getSupportId(),
        hasEmail: !!getContactUsEmail(),
        hasTelegram: !!getSupportTelegramUrl(),
      }))();
  }, []);

  if (!contact || (!contact.hasEmail && !contact.hasTelegram)) {
    return null;
  }
  return (
    <div style={{marginTop: 16, fontSize: 14}}>
      <p>
        {'Contact us via '}
        {contact.hasEmail && (
          <button type='button' style={linkStyle} onClick={openSupportEmail}>
            Email
          </button>
        )}
        {contact.hasEmail && contact.hasTelegram && ' or '}
        {contact.hasTelegram && (
          <button type='button' style={linkStyle} onClick={openSupportTelegram}>
            Telegram
          </button>
        )}
      </p>
      {!!contact.supportId && (
        <p style={{marginTop: 8, userSelect: 'text', wordBreak: 'break-all'}}>
          {`Support ID: ${contact.supportId}`}
        </p>
      )}
    </div>
  );
};

export default ErrorSupportInfo;
