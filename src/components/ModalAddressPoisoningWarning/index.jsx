'use client';
import React, {useEffect, useMemo, useState} from 'react';
import {Box, Modal} from '@mui/material';
import {getCommonAffixLengths} from 'dok-wallet-blockchain-networks/helper/addressPoisoning';
import s from './ModalAddressPoisoningWarning.module.css';

const ModalAddressPoisoningWarning = ({
  visible,
  suspiciousAddress,
  matchedAddress,
  onContinue,
  onCancel,
}) => {
  const [checked, setChecked] = useState(false);

  // Reset the acknowledgement each time the modal is reopened.
  useEffect(() => {
    if (visible) {
      setChecked(false);
    }
  }, [visible]);

  const handleCancel = () => {
    onCancel?.();
  };

  const handleContinue = () => {
    if (checked) {
      onContinue?.();
    }
  };

  // The actual overlap between the two addresses — usually longer than the
  // detection threshold, so highlight exactly what a scammer made match.
  const {prefixLength, suffixLength} = useMemo(
    () => getCommonAffixLengths(suspiciousAddress, matchedAddress),
    [suspiciousAddress, matchedAddress],
  );

  // Render an address with its matching prefix/suffix highlighted — this is the
  // part a poisoning attacker copies, so showing it teaches the user what to check.
  const renderAddress = address => {
    if (
      typeof address !== 'string' ||
      address.length <= prefixLength + suffixLength
    ) {
      return <span className={s.addressText}>{address}</span>;
    }
    const prefix = address.slice(0, prefixLength);
    const middle = address.slice(prefixLength, address.length - suffixLength);
    const suffix = suffixLength ? address.slice(-suffixLength) : '';
    return (
      <span className={s.addressText}>
        <span className={s.addressHighlight}>{prefix}</span>
        {middle}
        <span className={s.addressHighlight}>{suffix}</span>
      </span>
    );
  };

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'var(--secondaryBackgroundColor)',
    borderRadius: '10px',
    overflow: 'hidden',
    padding: '24px',
    maxWidth: '440px',
    width: '90%',
  };

  return (
    <Modal open={!!visible} onClose={handleCancel} sx={{zIndex: 99999}}>
      <Box sx={style}>
        <div className={s.container}>
          <div className={s.title}>Possible Address Poisoning</div>
          <p className={s.subtitle}>
            This address closely resembles one you used before, but it is not
            the same. Scammers plant lookalike addresses to redirect your funds.
          </p>

          <div className={s.card}>
            <div className={s.cardLabel}>Previously used</div>
            {renderAddress(matchedAddress)}
          </div>

          <div className={`${s.card} ${s.cardDanger}`}>
            <div className={`${s.cardLabel} ${s.cardLabelDanger}`}>
              New recipient
            </div>
            {renderAddress(suspiciousAddress)}
          </div>

          <p className={s.tipText}>
            Only the highlighted start and end match — always verify the middle
            characters too.
          </p>

          <label className={s.checkboxRow}>
            <input
              type='checkbox'
              checked={checked}
              onChange={() => setChecked(prev => !prev)}
            />
            <span className={s.checkboxText}>
              I understand the risk and want to continue
            </span>
          </label>

          <div className={s.actions}>
            <button
              className={s.continueBtn}
              disabled={!checked}
              style={{
                backgroundColor: checked ? '#E5484D' : 'var(--gray)',
                cursor: checked ? 'pointer' : 'not-allowed',
              }}
              onClick={handleContinue}>
              Continue
            </button>
            <button className={s.cancelBtn} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalAddressPoisoningWarning;
