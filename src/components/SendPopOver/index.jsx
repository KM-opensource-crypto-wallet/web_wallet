import React, {useCallback, useRef, useState} from 'react';
import s from './SendPopOver.module.css';
import ModalCustomDerivation from 'components/ModalCustomDerivation';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import {useRouter} from 'next/navigation';
import DokPopover from 'components/DokPopover';
import {isCustomDerivedChecked} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {useSelector} from 'react-redux';

// eslint-disable-next-line react/display-name
const SendPopOver = ({isBitcoin, isDeriveAddressChain}) => {
  const [showCustomDerivationModal, setShowCustomDerivationModal] =
    useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isCheckedStored = useSelector(isCustomDerivedChecked);
  const router = useRouter();
  const popoverRef = useRef(null);

  const onSuccessOfPasswordModal = useCallback(() => {
    setShowConfirmModal(false);
    router.push('/home/send/custom-derivation');
  }, [router]);

  const handleCustomDerivation = useCallback(() => {
    popoverRef.current?.close();
    if (!isCheckedStored) {
      setShowCustomDerivationModal(true);
    } else {
      setShowConfirmModal(true);
    }
  }, [isCheckedStored]);

  const handleSelectUTXOs = useCallback(() => {
    popoverRef.current?.close();
    router.push('/home/send/select-UTXOs');
  }, [router]);

  const handleHideModal = useCallback(isPressYes => {
    setShowCustomDerivationModal(false);
    if (isPressYes) {
      setShowConfirmModal(true);
    }
  }, []);
  return (
    <>
      <DokPopover ref={popoverRef}>
        <div className={s.popoverContainer}>
          {isBitcoin && (
            <button className={s.popoverItemView} onClick={handleSelectUTXOs}>
              <p className={s.popoverItemText}>{'Select UTXOs'}</p>
            </button>
          )}
          {isDeriveAddressChain && (
            <button
              className={s.popoverItemView}
              onClick={handleCustomDerivation}>
              <p className={s.popoverItemText}>{'Custom Derivation'}</p>
            </button>
          )}
        </div>
      </DokPopover>

      <ModalCustomDerivation
        visible={showCustomDerivationModal}
        hideModal={handleHideModal}
      />

      <ModalConfirmTransaction
        hideModal={() => {
          setShowConfirmModal(false);
        }}
        visible={showConfirmModal}
        onSuccess={onSuccessOfPasswordModal}
      />
    </>
  );
};

export default SendPopOver;
