import React, {useCallback, useRef, useState} from 'react';
import s from './CustomDerivationPopOver.module.css';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import {useDispatch, useSelector} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  deleteDeriveAddressInCurrentCoin,
  refreshCurrentCoin,
  setSelectedDeriveAddress,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {showToast} from 'utils/toast';
import {reportThunkRejection} from 'utils/thunkErrors';
import DokPopover from 'components/DokPopover';

const CustomDerivationPopOver = ({selectedItem}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const currentCoin = useSelector(selectCurrentCoin);
  const dispatch = useDispatch();
  const isDeleteRef = useRef(false);
  const popoverRef = useRef(null);

  const onSuccessOfPasswordModal = useCallback(() => {
    setShowConfirmModal(false);
    if (isDeleteRef?.current) {
      if (currentCoin?.address === selectedItem?.address) {
        showToast({
          type: 'errorToast',
          title: "Can't delete selected derive address",
        });
        return;
      }
      dispatch(
        deleteDeriveAddressInCurrentCoin({address: selectedItem?.address}),
      );
    } else if (!selectedItem?.privateKey) {
      // Keys are stripped from memory while locked; never copy "undefined".
      showToast({
        type: 'errorToast',
        title: 'Private key unavailable. Please log in again.',
      });
    } else {
      navigator.clipboard.writeText(selectedItem?.privateKey);
      showToast({
        type: 'successToast',
        title: 'Private Key copied',
      });
    }
  }, [
    currentCoin?.address,
    dispatch,
    selectedItem?.address,
    selectedItem?.privateKey,
  ]);

  const onSelectAddress = useCallback(async () => {
    popoverRef.current?.close();
    setTimeout(() => {
      dispatch(
        setSelectedDeriveAddress({
          address: selectedItem?.address,
          chain_name: currentCoin?.chain_name,
        }),
      );
    }, 400);
    await dispatch(
      refreshCurrentCoin({
        currentCoin: {
          ...currentCoin,
          address: selectedItem?.address,
          privateKey: selectedItem?.privateKey,
        },
      }),
    )
      .unwrap()
      .catch(reportThunkRejection({area: 'coin', op: 'refresh_address'}));
  }, [currentCoin, dispatch, selectedItem?.address, selectedItem?.privateKey]);

  const onPressCopyAddress = useCallback(() => {
    popoverRef.current?.close();
    navigator.clipboard.writeText(selectedItem?.address);
    showToast({
      type: 'successToast',
      title: 'Address copied',
    });
  }, [selectedItem?.address]);

  const onPressCopyDerivePath = useCallback(() => {
    popoverRef.current?.close();
    navigator.clipboard.writeText(selectedItem?.derivePath);
    showToast({
      type: 'successToast',
      title: 'Derive Path copied',
    });
  }, [selectedItem?.derivePath]);

  const onPressCopyPrivateKey = useCallback(() => {
    popoverRef.current?.close();
    isDeleteRef.current = false;
    setShowConfirmModal(true);
  }, []);

  const onPressDelete = useCallback(() => {
    popoverRef.current?.close();
    isDeleteRef.current = true;
    setShowConfirmModal(true);
  }, []);

  const isSelected = currentCoin?.address === selectedItem?.address;

  return (
    <>
      <DokPopover ref={popoverRef}>
        <div style={{display: 'flex', flexDirection: 'column'}}>
          <button className={s.popoverItemView} onClick={onSelectAddress}>
            <p className={s.popoverItemText}>{'Make Default'}</p>
          </button>
          <button className={s.popoverItemView} onClick={onPressCopyAddress}>
            <p className={s.popoverItemText}>{'Copy Address'}</p>
          </button>
          <button className={s.popoverItemView} onClick={onPressCopyDerivePath}>
            <p className={s.popoverItemText}>{'Copy Derive Path'}</p>
          </button>
          <button className={s.popoverItemView} onClick={onPressCopyPrivateKey}>
            <p className={s.popoverItemText}>{'Copy Private Key'}</p>
          </button>
          {!isSelected && (
            <button
              className={s.popoverItemView}
              style={{backgroundColor: 'red'}}
              onClick={onPressDelete}>
              <p className={s.popoverItemText} style={{color: 'white'}}>
                {'Delete'}
              </p>
            </button>
          )}
        </div>
      </DokPopover>
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

export default CustomDerivationPopOver;
