'use client';

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import Modal from '@mui/material/Modal';
import GeneralButton from 'components/Button';
import {CheckIcon, CopyIcon, QrIcon} from 'components/Home/HomeIcons';
import AddressTypeBadge from 'components/AddressTypeBadge';
import AddressQRSheet from 'components/AddressQRSheet';
import {copyToClipboard} from 'utils/copyToClipboard';
import {
  getCustomizePublicAddress,
  isBitcoinChain,
} from 'dok-wallet-blockchain-networks/helper';
import {formatDeriveAddressBalance} from 'dok-wallet-blockchain-networks/helper/deriveAddressBalance';
import s from './AddressSelectorSheet.module.css';

const TITLE_ID = 'address-selector-sheet-title';

// Single-select derive-address picker. One mounted sheet serves any number of
// trigger fields: everything row-specific arrives via present(payload), and
// payload.context is handed back to onSelect with the chosen entry. Bottom
// sheet on phones, centred dialog from 600px up.
const AddressSelectorSheet = forwardRef(({onSelect}, ref) => {
  const contextRef = useRef(null);
  const qrSheetRef = useRef(null);
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

  const onPressCopy = useCallback(item => {
    copyToClipboard(item?.address);
  }, []);

  const onPressQR = useCallback(
    item => {
      qrSheetRef.current?.present({
        address: item?.address,
        symbol: payload?.symbol,
        chain_name: payload?.chain_name,
        derivePath: item?.derivePath,
      });
    },
    [payload?.symbol, payload?.chain_name],
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
      }}
      aria-labelledby={TITLE_ID}
      slotProps={{backdrop: {className: s.backdrop}}}>
      <div className={s.sheet}>
        <div className={s.handle} />
        <h2 id={TITLE_ID} className={s.title}>
          Select Address
        </h2>
        <div className={s.list}>
          {items.length ? (
            items.map(item => {
              const isSelected = item?.address === payload?.selectedAddress;
              const isApplying = item?.address === applyingAddress;
              return (
                <div
                  key={item?.derivePath || item?.address}
                  className={`${s.optionRow} ${
                    isSelected ? s.optionRowSelected : ''
                  }`}>
                  <button
                    type='button'
                    className={s.optionMain}
                    aria-label={`Select address ${getCustomizePublicAddress(
                      item?.address,
                    )}`}
                    aria-pressed={isSelected}
                    disabled={!!applyingAddress}
                    onClick={() => onPressItem(item)}>
                    {/* Line 1: the shortened address never shrinks; line 2
                        carries the path and the balance so nothing competes
                        with it and no element has to ellipsize. */}
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
                      {(!!item?.derivePath || showBalance) && (
                        <p className={s.metaRow}>
                          <span className={s.derivePathText}>
                            {item?.derivePath || ''}
                          </span>
                          {showBalance && (
                            <span className={s.balanceText}>
                              {formatDeriveAddressBalance({
                                balance: item?.balance,
                                decimal: payload?.decimal,
                                symbol: payload?.symbol,
                              })}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </button>
                  <div className={s.actions}>
                    <GeneralButton
                      variant='unstyled'
                      aria-label='Copy address'
                      disabled={!!applyingAddress}
                      className={s.iconButton}
                      onClick={() => onPressCopy(item)}>
                      <CopyIcon size={17} />
                    </GeneralButton>
                    <GeneralButton
                      variant='unstyled'
                      aria-label='Show address QR code'
                      disabled={!!applyingAddress}
                      className={s.iconButton}
                      onClick={() => onPressQR(item)}>
                      <QrIcon size={17} />
                    </GeneralButton>
                    {isApplying ? (
                      <span className={s.spinner} aria-hidden='true' />
                    ) : (
                      isSelected && (
                        <span className={s.check} aria-hidden='true'>
                          <CheckIcon size={12} />
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className={s.emptyText}>No addresses available yet.</p>
          )}
        </div>
        {/* Opens OVER this sheet; MUI stacks nested modals so the selector
            stays mounted (dimmed + non-interactive) underneath. */}
        <AddressQRSheet ref={qrSheetRef} />
      </div>
    </Modal>
  );
});

AddressSelectorSheet.displayName = 'AddressSelectorSheet';

export default AddressSelectorSheet;
