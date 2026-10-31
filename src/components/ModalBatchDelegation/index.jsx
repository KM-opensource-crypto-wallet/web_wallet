import React, {useState} from 'react';
import {Box, Modal} from '@mui/material';
import {useDispatch, useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {currencySymbol} from 'data/currency';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  confirmBatchDelegationRemoved,
  revokeDelegation,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {showToast} from 'src/utils/toast';
import s from 'components/ModalDelegation/ModalDelegation.module.css';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '10px',
  overflow: 'hidden',
  padding: '24px',
  maxWidth: '400px',
  width: '90%',
};

const feeText = (notice, localCurrency) => {
  if (notice?.estimatedFee == null) {
    return 'A small network fee applies.';
  }
  const fee = new BigNumber(notice.estimatedFee);
  const fiat = notice.currencyRate
    ? fee.multipliedBy(notice.currencyRate)
    : null;
  const symbol = currencySymbol[localCurrency] || '';
  const fiatText =
    fiat == null
      ? ''
      : fiat.lt(0.01)
        ? ` (< ${symbol}0.01)`
        : ` (~${symbol}${fiat.toFixed(2)})`;
  return `Network fee ≈ ${fee.decimalPlaces(8, BigNumber.ROUND_UP).toFixed()} ${notice.chain_symbol}${fiatText}`;
};

// Asks a listed account (checkBatchDelegation) to remove its batch-sending
// delegation on Ethereum.
const ModalBatchDelegation = ({notice, onClose}) => {
  const dispatch = useDispatch();
  const localCurrency = useSelector(getLocalCurrency);
  const [isRemoving, setIsRemoving] = useState(false);

  const onTurnOff = async () => {
    setIsRemoving(true);
    try {
      const {status} = await dispatch(
        revokeDelegation({coinId: notice.coinId}),
      ).unwrap();
      showToast(
        status === 'pending'
          ? {
              type: 'successToast',
              title: 'Removal Submitted',
              message: 'It should finish within a minute.',
            }
          : {type: 'successToast', title: 'Batch Sending Switched Off'},
      );
      onClose();
      // Keeps re-checking (a pending revoke still reads as delegated) and
      // marks the address as done once the chain shows the delegation gone.
      dispatch(confirmBatchDelegationRemoved({address: notice.address}));
    } catch (e) {
      showToast({
        type: 'errorToast',
        title: 'Failed to Switch Off Batch Sending',
        message: e?.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Modal open={!!notice} onClose={isRemoving ? undefined : onClose}>
      <Box sx={style}>
        <div className={s.container}>
          <p className={s.title}>Recommended: switch off batch sending</p>
          <p className={s.body}>
            Your Ethereum account is still set up for batch sending from when
            you last used that feature. We&apos;ve paused batch sending while we
            upgrade it, and as a precaution we recommend switching it off. It
            takes one quick transaction.
          </p>
          <p className={s.body}>{feeText(notice, localCurrency)}</p>
          <p className={s.body}>
            Tip: only sign messages from sites you trust.
          </p>
          <div className={s.actions}>
            <button
              className={s.primaryBtn}
              onClick={onTurnOff}
              disabled={isRemoving}>
              {isRemoving ? 'Turning off…' : 'Turn off now'}
            </button>
            <button
              className={s.secondaryBtn}
              onClick={onClose}
              disabled={isRemoving}>
              Later
            </button>
          </div>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalBatchDelegation;
