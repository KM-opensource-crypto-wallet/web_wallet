import DokPopover from 'components/DokPopover';
import {useRouter} from 'next/navigation';
import {useCallback, useRef, useState} from 'react';
import s from './SelectedUTXOsPopOver.module.css';
import {isCustomDerivedChecked} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import ModalCustomDerivation from '../ModalCustomDerivation';
import {useSelector} from 'react-redux';
import ModalConfirmTransaction from '../ModalConfirmTransaction';

// eslint-disable-next-line react/display-name
const SelectedUTXOsPopOver = () => {
  const router = useRouter();
  const popoverRef = useRef(null);
  const [showCustomDerivationModal, setShowCustomDerivationModal] =
    useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isCheckedStored = useSelector(isCustomDerivedChecked);

  const onSelectUTXOs = useCallback(() => {
    popoverRef.current?.close();
    router.push('/home/send/select-UTXOs');
  }, [router]);

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
  const handleHideModal = useCallback(isPressYes => {
    setShowCustomDerivationModal(false);
    if (isPressYes) {
      setShowConfirmModal(true);
    }
  }, []);
  return (
    <>
      <DokPopover ref={popoverRef}>
        <button className={s.popoverItemView} onClick={onSelectUTXOs}>
          <p className={s.popoverItemText}>{'Select UTXOs'}</p>
        </button>
        <button className={s.popoverItemView} onClick={handleCustomDerivation}>
          <p className={s.popoverItemText}>{'Custom Derivation'}</p>
        </button>
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

export default SelectedUTXOsPopOver;
