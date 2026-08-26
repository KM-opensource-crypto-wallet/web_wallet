'use client';

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {Box, CircularProgress, Modal} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddressTypeBadge from 'components/AddressTypeBadge';
import {
  getCustomizePublicAddress,
  isBitcoinChain,
} from 'dok-wallet-blockchain-networks/helper';
import s from './AddressSelectorSheet.module.css';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '10px',
  '@media (min-width: 768px)': {
    width: '50%',
    maxWidth: '560px',
  },
  overflow: 'hidden',
};

// Single-select derive-address picker. One mounted sheet serves any number of
// trigger fields: everything row-specific arrives via present(payload), and
// payload.context is handed back to onSelect with the chosen entry.
const AddressSelectorSheet = forwardRef(({onSelect}, ref) => {
  const contextRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState(null);
  // Address whose selection is currently being applied. While set, the sheet
  // stays open with a spinner on that row (onSelect may refresh balances etc.)
  // and closes only once onSelect settles.
  const [applyingAddress, setApplyingAddress] = useState(null);

  useImperativeHandle(
    ref,
    () => ({
      present: data => {
        contextRef.current = data?.context;
        setApplyingAddress(null);
        setPayload(data || null);
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [],
  );

  const onPressItem = useCallback(
    async item => {
      if (applyingAddress) {
        return;
      }
      setApplyingAddress(item?.address);
      try {
        await onSelect?.(item, contextRef.current);
      } catch (e) {
        console.warn('address selection failed', e?.message);
      } finally {
        setApplyingAddress(null);
        setIsOpen(false);
      }
    },
    [onSelect, applyingAddress],
  );

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const showBalance = isBitcoinChain(payload?.chain_name);

  return (
    <Modal
      open={isOpen}
      onClose={() => {
        if (!applyingAddress) {
          setIsOpen(false);
        }
      }}>
      <Box sx={modalStyle}>
        <div className={s.container}>
          <p className={s.title}>Select Address</p>
          <div className={s.list}>
            {items.length ? (
              items.map(item => {
                const isSelected = item?.address === payload?.selectedAddress;
                const isApplying = item?.address === applyingAddress;
                return (
                  <button
                    type='button'
                    key={item?.derivePath || item?.address}
                    className={s.optionRow}
                    disabled={!!applyingAddress}
                    onClick={() => onPressItem(item)}>
                    <div className={s.optionLabelBox}>
                      <p className={s.addressRow}>
                        <span className={s.addressText} title={item?.address}>
                          {getCustomizePublicAddress(item?.address)}
                        </span>
                        <AddressTypeBadge
                          chain_name={payload?.chain_name}
                          item={item}
                        />
                      </p>
                      {!!item?.derivePath && (
                        <p className={s.derivePathText}>{item.derivePath}</p>
                      )}
                    </div>
                    {showBalance && (
                      <p className={s.balanceText}>
                        {`${item?.balance || 0} ${payload?.symbol || ''}`}
                      </p>
                    )}
                    {isApplying ? (
                      <CircularProgress
                        size={18}
                        sx={{color: 'var(--background)', marginLeft: '8px'}}
                      />
                    ) : (
                      isSelected && (
                        <CheckCircleIcon
                          sx={{
                            fontSize: 22,
                            color: 'var(--background)',
                            marginLeft: '8px',
                          }}
                        />
                      )
                    )}
                  </button>
                );
              })
            ) : (
              <p className={s.emptyText}>No addresses available yet.</p>
            )}
          </div>
        </div>
      </Box>
    </Modal>
  );
});

AddressSelectorSheet.displayName = 'AddressSelectorSheet';

export default AddressSelectorSheet;
