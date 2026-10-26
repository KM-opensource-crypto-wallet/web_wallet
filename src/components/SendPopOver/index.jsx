import {useAppRoutes} from 'src/hooks/useAppRoutes';
import React, {useCallback, useRef, useState} from 'react';
import s from './SendPopOver.module.css';
import ModalCustomDerivation from 'components/ModalCustomDerivation';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import {useRouter} from 'next/navigation';
import DokPopover from 'components/DokPopover';
import {isCustomDerivedChecked} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {useSelector} from 'react-redux';
import {BranchIcon, RowsIcon} from 'components/Home/HomeIcons';

const SendPopOver = ({isBitcoin, isDeriveAddressChain}) => {
  const [showCustomDerivationModal, setShowCustomDerivationModal] =
    useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isCheckedStored = useSelector(isCustomDerivedChecked);
  const router = useRouter();
  const routes = useAppRoutes();
  const popoverRef = useRef(null);

  const onSuccessOfPasswordModal = useCallback(() => {
    setShowConfirmModal(false);
    router.push(routes.coin.customDerivation());
  }, [router, routes]);

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
    router.push(routes.coin.selectUtxos());
  }, [router, routes]);

  const handleHideModal = useCallback(isPressYes => {
    setShowCustomDerivationModal(false);
    if (isPressYes) {
      setShowConfirmModal(true);
    }
  }, []);
  return (
    <>
      <DokPopover ref={popoverRef} paperClassName={s.paper}>
        <div className={s.popoverContainer}>
          {isBitcoin && (
            <button
              type='button'
              className={s.popoverItemView}
              onClick={handleSelectUTXOs}>
              <span className={s.popoverItemIcon}>
                <RowsIcon size={16} />
              </span>
              <span className={s.popoverItemTextBox}>
                <span className={s.popoverItemText}>Select UTXOs</span>
                <span className={s.popoverItemSub}>
                  Choose which coins to spend
                </span>
              </span>
            </button>
          )}
          {isDeriveAddressChain && (
            <button
              type='button'
              className={s.popoverItemView}
              onClick={handleCustomDerivation}>
              <span className={s.popoverItemIcon}>
                <BranchIcon size={16} />
              </span>
              <span className={s.popoverItemTextBox}>
                <span className={s.popoverItemText}>Custom derivation</span>
                <span className={s.popoverItemSub}>
                  Enter your own derivation path
                </span>
              </span>
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
