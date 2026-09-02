'use client';

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';
import {Box, Modal} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QRCode from 'react-qr-code';
import {copyToClipboard} from 'utils/copyToClipboard';
import s from './AddressQRSheet.module.css';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  maxWidth: '420px',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '10px',
  overflow: 'hidden',
};

// Displays one address as a QR code. Presented over another modal (e.g.
// AddressSelectorSheet), which stays mounted underneath. Payload arrives via
// present(data): {address, symbol?, chain_name?, derivePath?}.
const AddressQRSheet = forwardRef((_props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState(null);

  useImperativeHandle(
    ref,
    () => ({
      present: data => {
        setPayload(data || null);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [],
  );

  const onPressCopy = useCallback(() => {
    copyToClipboard(payload?.address);
  }, [payload?.address]);

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <Box sx={modalStyle}>
        <div className={s.container}>
          <p className={s.headerTitle}>Address QR</p>
          {/* Explicit white so the QR stays scannable in dark theme. */}
          {!!payload?.address && (
            <div className={s.qrContainer}>
              <QRCode
                value={payload.address}
                size={220}
                bgColor='#FFFFFF'
                fgColor='#000000'
              />
            </div>
          )}
          <p className={s.addressText}>{payload?.address}</p>
          {!!payload?.derivePath && (
            <p className={s.derivePathText}>{payload.derivePath}</p>
          )}
          <button type='button' className={s.copyButton} onClick={onPressCopy}>
            <ContentCopyIcon sx={{fontSize: 20}} />
            <span>Copy Address</span>
          </button>
        </div>
      </Box>
    </Modal>
  );
});

AddressQRSheet.displayName = 'AddressQRSheet';

export default AddressQRSheet;
