'use client';

import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';

import {useSelector, useDispatch} from 'react-redux';
import {currencySymbol} from 'data/currency';
import {
  getCurrentWalletIsAddMoreAddressPopupHidden,
  isImportWalletWithPrivateKey,
  selectCurrentCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  addEVMAndTronDeriveAddresses,
  refreshCurrentCoin,
  setIsAddMoreAddressPopupHidden,
  setSelectedDeriveAddress,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';

import s from './Send.module.css';
import {useRouter} from 'next/navigation';

const icons = require(`assets/images/send`).default;
const copyIcon = require(`assets/images/icons`).default;
import Link from 'next/link';
import GoBackButton from 'components/GoBackButton';
import Loading from 'components/Loading';
import Image from 'next/image';
import {
  getCustomizePublicAddress,
  isBitcoinChain,
  isPrivateKeyNotSupportedChain,
  isDeriveAddressSupportChain,
  isStakingChain,
} from 'dok-wallet-blockchain-networks/helper';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import {toast} from 'react-toastify';
import classNames from '../Home.module.css';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import IconButton from '@mui/material/IconButton';
import Close from '@mui/icons-material/Close';
import SelectInput from 'components/SelectInput';
import SendPopOver from 'components/SendPopOver';
import SelectedUTXOsPopOver from 'src/components/SelectedUTXOsPopOver';
import {clearSelectedUTXOs} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import ModalUnclaimedDeposit from 'components/ModalUnclaimedDeposit';

const SendScreen = () => {
  const router = useRouter();
  const localCurrency = useSelector(getLocalCurrency);
  const currentCoin = useSelector(selectCurrentCoin);
  const isAddMoreAddressPopupHide = useSelector(
    getCurrentWalletIsAddMoreAddressPopupHidden,
  );
  const [modalUnclaimDepositVisible, setModalUnclaimDepositVisible] =
    useState(false);

  //   const { theme } = useContext(ThemeContext);
  //   const styles = myStyles(theme);

  const isBitcoin = isBitcoinChain(currentCoin?.chain_name);
  const isStaking =
    isStakingChain(currentCoin?.chain_name) && currentCoin?.type === 'coin';

  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  //   const [refreshing, setRefreshing] = useState(false);

  //   const wallet = useSelector(selectCurrentWallet);
  //   const [lastRefreshTime, setLastRefreshTime] = useState(
  //     wallet.updateTimestamp ?? 0
  //   );
  //   const { item } = route.params;
  const dispatch = useDispatch();

  const isDeriveAddressChain = isDeriveAddressSupportChain(
    currentCoin?.chain_name,
  );
  const isImportWithPrivateKey = useSelector(isImportWalletWithPrivateKey);

  const deriveAddresses = useMemo(() => {
    return currentCoin?.deriveAddresses?.map(subItem => ({
      options: subItem,
      label: `${getCustomizePublicAddress(subItem?.address)} ${
        isBitcoin ? `(${subItem?.balance || 0} ${currentCoin?.symbol})` : ''
      }`,
      value: subItem.address,
    }));
  }, [currentCoin?.deriveAddresses, currentCoin?.symbol, isBitcoin]);

  const coinId = useMemo(() => {
    return currentCoin?._id + currentCoin?.name + currentCoin?.chain_name;
  }, [currentCoin]);

  const listOfUnClaimedDeposits = useMemo(() => {
    return currentCoin?.listOfUnClaimedDeposits || [];
  }, [currentCoin]);

  useEffect(() => {
    if (currentCoin?.address) {
      dispatch(
        refreshCurrentCoin({
          isFetchUnclaimDeposit: true,
        }),
      )
        .unwrap()
        .then(() => {
          setIsLoading(false);
        })
        .catch(e => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId, dispatch]);

  useEffect(() => {
    if (listOfUnClaimedDeposits?.length && !isLoading) {
      setModalUnclaimDepositVisible(true);
    }
  }, [isLoading, listOfUnClaimedDeposits?.length]);

  const onPressAddAddresses = useCallback(() => {
    dispatch(addEVMAndTronDeriveAddresses());
  }, [dispatch]);

  const onPressAddressClose = useCallback(() => {
    dispatch(setIsAddMoreAddressPopupHidden(true));
  }, [dispatch]);

  const hideModal = useCallback(() => {
    setModalUnclaimDepositVisible(false);
  }, []);

  const onChangeSelectedAddress = useCallback(
    async value => {
      const subItem = deriveAddresses.find(item => item.value === value);
      dispatch(
        setSelectedDeriveAddress({
          address: subItem.options?.address,
          chain_name: currentCoin?.chain_name,
        }),
      );

      await dispatch(
        refreshCurrentCoin({
          isFetchUnclaimDeposit: true,
          currentCoin: {
            ...currentCoin,
            address: subItem.options?.address,
            privateKey: subItem?.options?.privateKey || currentCoin?.privateKey,
          },
        }),
      ).unwrap();
    },
    [currentCoin, deriveAddresses, dispatch],
  );

  const onSuccessOfPrivateKey = useCallback(() => {
    setShowConfirmModal(false);
    if (currentCoin?.privateKey) {
      navigator.clipboard.writeText(currentCoin?.privateKey);
      toast.success('Private key copied');
    }
  }, [currentCoin?.privateKey]);

  return (
    <>
      <div className={s.goBack}>
        <GoBackButton />
        {isDeriveAddressChain && !isImportWithPrivateKey ? (
          <SendPopOver />
        ) : (
          isBitcoin && <SelectedUTXOsPopOver />
        )}
      </div>
      {isLoading ? (
        <Loading />
      ) : (
        <div className={s.container}>
          {isDeriveAddressChain &&
            !isImportWithPrivateKey &&
            !isAddMoreAddressPopupHide && (
              <div className={classNames.syncView}>
                <div
                  className={
                    classNames.syncTitle
                  }>{`Do you want to allow more addresses under this wallet?`}</div>
                <button
                  className={classNames.syncButton}
                  onClick={onPressAddAddresses}>
                  <div className={classNames.syncButtonTitle}>Add</div>
                </button>
                <IconButton
                  aria-label='closeSyncDiv'
                  onClick={onPressAddressClose}
                  edge='end'
                  sx={{
                    '&  .MuiSvgIcon-root': {
                      color: 'var(--font)',
                    },
                  }}>
                  <Close />
                </IconButton>
              </div>
            )}
          <div className={s.box}>
            <div className={s.coinList}>
              <div className={s.coinIcon}>
                <Image
                  src={currentCoin?.icon}
                  height={80}
                  width={80}
                  alt={'currency_icon'}
                />
              </div>

              <div className={s.coinBox}>
                <div className={s.cryptoOverlay}>
                  <p className={s.coinNumber} style={{marginRight: 5}}>
                    {currentCoin?.totalAmount}
                  </p>
                  <p className={s.coinNumber}>
                    {currentCoin?.symbol?.toUpperCase()}
                  </p>
                  {isBitcoin && (
                    <p
                      className={
                        s.coinNumber
                      }>{` (${currentCoin?.chain_display_name})`}</p>
                  )}
                </div>
                <p className={s.coinNumber}>{currentCoin?.name}</p>
              </div>
              <p className={s.coinSum}>
                {currencySymbol[localCurrency] || ''}
                {currentCoin?.totalCourse}
              </p>
            </div>
            <div className={s.btnList}>
              <Link
                href={`/home/send/send-funds`}
                className={`${s.btn} ${s.shadow}`}
                style={{marginRight: 20}}
                onClick={() => dispatch(clearSelectedUTXOs())}>
                <div className={s.icon}>{icons.send}</div>
                <p className={s.btnText}>Send</p>
              </Link>
              <Link
                className={`${s.btn} ${s.shadow}`}
                href={'/home/send/receive-funds'}>
                <div className={s.icon}>{icons.rec}</div>
                <p className={s.btnText}>Receive</p>
              </Link>
            </div>
            {(isBitcoinChain || isDeriveAddressChain) &&
              Array.isArray(deriveAddresses) && (
                <div>
                  <p className={s.addresTitle}>Select Address:</p>
                  <div className={s.addressViev}>
                    <SelectInput
                      listData={deriveAddresses}
                      onValueChange={onChangeSelectedAddress}
                      value={currentCoin?.address}
                      placeholder={'Select Network'}
                    />
                  </div>
                </div>
              )}
            <div className={s.boxAdress}>
              <p className={s.addresTitle}>Your Address:</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentCoin?.address || '');
                  toast.success('address copied');
                }}>
                <div style={{fill: 'var(--background)'}}>{copyIcon.copy}</div>
              </button>
            </div>
            <p className={s.address}>{currentCoin?.address || ''}</p>
            {!isPrivateKeyNotSupportedChain(currentCoin?.chain_name) && (
              <>
                <div className={s.boxAdress}>
                  <p className={s.privateKeyTitle}>Private Key:</p>
                  <button
                    onClick={() => {
                      setShowConfirmModal(true);
                    }}>
                    <div style={{fill: 'var(--background)'}}>
                      {copyIcon.copy}
                    </div>
                  </button>
                </div>
                <p className={s.privateKey}>
                  {
                    'Click here to copy the private key. Ensure that you keep your private key secure.'
                  }
                </p>
              </>
            )}
            <div className={s.actionBtnList}>
              <button
                className={s.button}
                onClick={() => router.push(`/home/transactions`)}>
                TRANSACTION HISTORY
              </button>
              {isStaking && (
                <button
                  className={s.button}
                  onClick={() => router.push(`/home/staking-list`)}>
                  STAKING
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <ModalConfirmTransaction
        hideModal={() => {
          setShowConfirmModal(false);
        }}
        visible={showConfirmModal}
        onSuccess={onSuccessOfPrivateKey}
      />
      {!isLoading && (
        <ModalUnclaimedDeposit
          visible={modalUnclaimDepositVisible}
          hideModal={hideModal}
        />
      )}
    </>
  );
};

export default SendScreen;
