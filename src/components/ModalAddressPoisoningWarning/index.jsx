'use client';
import React, {useEffect, useMemo, useState} from 'react';
import Modal from '@mui/material/Modal';
import {getCommonAffixLengths} from 'dok-wallet-blockchain-networks/helper/addressPoisoning';
import GeneralButton from 'components/Button';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import shell from 'components/ModalReset/ModalReset.module.css';
import s from './ModalAddressPoisoningWarning.module.css';

// Security warning before sending to an address that mimics one used before.
// Continue stays disabled until the risk checkbox is ticked. Bottom sheet on
// phones, centred dialog from 600px up.
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
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (visible) {
        setChecked(false);
      }
    })();
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

  return (
    <Modal
      open={!!visible}
      onClose={handleCancel}
      sx={{zIndex: 99999}}
      aria-labelledby='address-poisoning-title'
      aria-describedby='address-poisoning-description'
      slotProps={{backdrop: {className: shell.backdrop}}}>
      <div className={shell.sheet}>
        <div className={shell.handle} />
        <span className={`${shell.tile} ${shell.danger}`}>
          <svg
            width='22'
            height='22'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'>
            <path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' />
            <path d='M12 8v4' />
            <path d='M12 16h.01' />
          </svg>
        </span>
        <h2 id='address-poisoning-title' className={shell.title}>
          Possible Address Poisoning
        </h2>
        <div className={`${shell.body} ${s.body}`}>
          <p
            id='address-poisoning-description'
            className={`${shell.warning} ${shell.warningDanger}`}>
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
        </div>

        <div className={shell.actions}>
          <GeneralButton variant='secondary' fullWidth onClick={handleCancel}>
            Cancel
          </GeneralButton>
          <GeneralButton
            variant='danger'
            fullWidth
            disabled={!checked}
            onClick={handleContinue}>
            Continue
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalAddressPoisoningWarning;
