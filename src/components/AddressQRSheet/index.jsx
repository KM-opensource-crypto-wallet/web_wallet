'use client';

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';
import Modal from '@mui/material/Modal';
import QRCode from 'react-qr-code';
import GeneralButton from 'components/Button';
import {CopyIcon} from 'components/Home/HomeIcons';
import {copyToClipboard} from 'utils/copyToClipboard';
import s from './AddressQRSheet.module.css';

const TITLE_ID = 'address-qr-sheet-title';

// Displays one address as a QR code. Presented over another modal (e.g.
// AddressSelectorSheet), which stays mounted underneath. Payload arrives via
// present(data): {address, symbol?, chain_name?, derivePath?}. Bottom sheet on
// phones, centred dialog from 600px up.
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
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      aria-labelledby={TITLE_ID}
      slotProps={{backdrop: {className: s.backdrop}}}>
      <div className={s.sheet}>
        <div className={s.handle} />
        <h2 id={TITLE_ID} className={s.title}>
          Address QR
        </h2>
        {/* Always dark-on-white, whatever the theme: scanners read it best. */}
        {!!payload?.address && (
          <div className={s.qrStage}>
            <div className={s.qrTile}>
              <span className={s.corners} aria-hidden='true' />
              <QRCode
                value={payload.address}
                size={220}
                bgColor='#FFFFFF'
                fgColor='#000000'
                className={s.qr}
              />
            </div>
          </div>
        )}
        <div className={s.field}>
          <p className={s.address}>{payload?.address}</p>
          {!!payload?.derivePath && (
            <p className={s.derivePath}>{payload.derivePath}</p>
          )}
        </div>
        <GeneralButton
          variant='unstyled'
          fullWidth
          className={s.copy}
          onClick={onPressCopy}>
          <CopyIcon size={18} />
          <span>Copy Address</span>
        </GeneralButton>
      </div>
    </Modal>
  );
});

AddressQRSheet.displayName = 'AddressQRSheet';

export default AddressQRSheet;
