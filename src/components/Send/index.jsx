import {useAppRoutes} from 'src/hooks/useAppRoutes';
import {reportThunkRejection} from 'utils/thunkErrors';
import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';

import {useSelector, useDispatch} from 'react-redux';
import {currencySymbol} from 'data/currency';
import {
  getCurrentWalletIsAddMoreAddressPopupHidden,
  isImportWalletWithPrivateKey,
  selectCurrentCoin,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  addEVMAndTronDeriveAddresses,
  refreshCurrentCoin,
  revokeDelegation,
  setIsAddMoreAddressPopupHidden,
  setSelectedDeriveAddress,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  getCryptoProviders,
  getExchangeProviders,
} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';

import s from './Send.module.css';
import {useRouter} from 'next/navigation';

import Loading from 'components/Loading';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import {copyToClipboard} from 'utils/copyToClipboard';
import {showToast} from 'src/utils/toast';
import {
  BuyIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  HistoryIcon,
  InfoIcon,
  KeyIcon,
  QrIcon,
  ReceiveIcon,
  SendIcon,
  StakingIcon,
  SwapIcon,
  UnlinkIcon,
} from 'components/Home/HomeIcons';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/useHome';
import {
  delay,
  isBitcoinChain,
  isEip7702SupportedChain,
  isPrivateKeyNotSupportedChain,
  isDeriveAddressSupportChain,
  isStakingChain,
  getStakignKey,
} from 'dok-wallet-blockchain-networks/helper';
import {getVisibleDeriveAddresses} from 'dok-wallet-blockchain-networks/service/bitcoinHdAddress';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import ModalDelegation from 'components/ModalDelegation';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import AddressSelectorSheet from 'components/AddressSelectorSheet';
import AddressTypeBadge from 'components/AddressTypeBadge';
import SendPopOver from 'components/SendPopOver';
import {clearSelectedUTXOs} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import ModalUnclaimedDeposit from 'components/ModalUnclaimedDeposit';

// Glass card row used for history / staking, and (flat) inside Advanced.
const ActionRow = ({icon, tone, title, hint, onClick, chevron = true}) => (
  <GeneralButton variant='unstyled' className={s.row} onClick={onClick}>
    <span className={`${s.rowIcon} ${tone ? s[tone] : ''}`}>{icon}</span>
    <span className={s.rowText}>
      <span className={s.rowTitle}>{title}</span>
      {hint ? <span className={s.rowHint}>{hint}</span> : null}
    </span>
    {chevron ? <ChevronRightIcon size={17} className={s.chevron} /> : null}
  </GeneralButton>
);

const SendScreen = () => {
  const router = useRouter();
  const routes = useAppRoutes();
  const localCurrency = useSelector(getLocalCurrency);
  const currentCoin = useSelector(selectCurrentCoin);
  const currentWallet = useSelector(selectCurrentWallet);
  const buyProviders = useSelector(getCryptoProviders);
  const swapProviders = useSelector(getExchangeProviders);
  const isAddMoreAddressPopupHide = useSelector(
    getCurrentWalletIsAddMoreAddressPopupHidden,
  );
  const [modalUnclaimDepositVisible, setModalUnclaimDepositVisible] =
    useState(false);
  // One sheet serves the picker; the selected entry comes straight back to
  // onChangeSelectedAddress.
  const addressSheetRef = useRef();

  const isBitcoin = isBitcoinChain(currentCoin?.chain_name);
  const isStaking = isStakingChain(
    getStakignKey(currentCoin?.chain_name, currentCoin?.symbol),
  );

  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [delegationModalVisible, setDelegationModalVisible] = useState(false);
  const [delegationLoading, setDelegationLoading] = useState(false);
  const copiedTimer = useRef(null);

  const dispatch = useDispatch();

  const isDeriveAddressChain = isDeriveAddressSupportChain(
    currentCoin?.chain_name,
  );
  const isImportWithPrivateKey = useSelector(isImportWalletWithPrivateKey);

  // Change-chain entries are not user accounts, so they only show up in the
  // picker when they actually hold funds (getVisibleDeriveAddresses).
  const deriveAddresses = useMemo(() => {
    return getVisibleDeriveAddresses(
      currentCoin?.chain_name,
      currentCoin?.deriveAddresses,
    );
  }, [currentCoin?.chain_name, currentCoin?.deriveAddresses]);

  const selectedDeriveAddressItem = useMemo(() => {
    return currentCoin?.deriveAddresses?.find(
      subItem => subItem?.address === currentCoin?.address,
    );
  }, [currentCoin?.deriveAddresses, currentCoin?.address]);

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
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (listOfUnClaimedDeposits?.length && !isLoading) {
        setModalUnclaimDepositVisible(true);
      }
    })();
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
    async subItem => {
      // Let the sheet's close animation finish before the refresh re-renders
      // the screen underneath it.
      await delay(300);
      dispatch(
        setSelectedDeriveAddress({
          address: subItem?.address,
          chain_name: currentCoin?.chain_name,
        }),
      );

      await dispatch(
        refreshCurrentCoin({
          isFetchUnclaimDeposit: true,
          currentCoin: {
            ...currentCoin,
            address: subItem?.address,
            privateKey: subItem?.privateKey || currentCoin?.privateKey,
          },
        }),
      )
        .unwrap()
        .catch(reportThunkRejection({area: 'coin', op: 'refresh_address'}));
    },
    [currentCoin, dispatch],
  );

  const onSuccessOfPrivateKey = useCallback(() => {
    setShowConfirmModal(false);
    if (currentCoin?.privateKey) {
      copyToClipboard(currentCoin?.privateKey, 'Private key copied');
    }
  }, [currentCoin?.privateKey]);

  const onRevokeDelegation = useCallback(async () => {
    setDelegationLoading(true);
    try {
      await dispatch(revokeDelegation()).unwrap();
      showToast({
        type: 'successToast',
        title: 'Delegation Removed',
        message: 'EIP-7702 delegation has been successfully revoked.',
      });
    } catch (e) {
      console.error('Error revoking delegation', e);
      showToast({
        type: 'errorToast',
        title: 'Failed to Remove Delegation',
        message: 'Something went wrong. Please try again.',
      });
    } finally {
      setDelegationLoading(false);
    }
  }, [dispatch]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const onCopyAddress = useCallback(async () => {
    if (await copyToClipboard(currentCoin?.address)) {
      setAddressCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setAddressCopied(false), 2000);
    }
  }, [currentCoin?.address]);

  const openAddressPicker = useCallback(() => {
    addressSheetRef.current?.present({
      chain_name: currentCoin?.chain_name,
      symbol: currentCoin?.symbol,
      decimal: currentCoin?.decimal,
      items: deriveAddresses,
      selectedAddress: currentCoin?.address,
    });
  }, [currentCoin, deriveAddresses]);

  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';
  const walletName = currentWallet?.walletName || 'Wallet';
  const showMenu =
    isBitcoin || (isDeriveAddressChain && !isImportWithPrivateKey);
  const showAddAddressesNotice =
    isDeriveAddressChain &&
    !isBitcoin &&
    !isImportWithPrivateKey &&
    !isAddMoreAddressPopupHide;
  const showAddressSelector =
    (isBitcoin || isDeriveAddressChain) && deriveAddresses?.length > 1;
  const selectedAddressIndex = showAddressSelector
    ? deriveAddresses.findIndex(item => item?.address === currentCoin?.address)
    : -1;
  const showNetwork = currentCoin?.type === 'token' || isBitcoin;
  const showPrivateKey = !isPrivateKeyNotSupportedChain(
    currentCoin?.chain_name,
  );
  const showDelegation =
    !!currentCoin?.isDelegationAvailable &&
    isEip7702SupportedChain(currentCoin?.chain_name);

  const quickActions = [
    {
      key: 'send',
      label: 'Send',
      Icon: SendIcon,
      onClick: () => {
        dispatch(clearSelectedUTXOs());
        router.push(routes.coin.sendFunds());
      },
    },
    {
      key: 'receive',
      label: 'Receive',
      Icon: ReceiveIcon,
      onClick: () => router.push(routes.coin.receiveFunds()),
    },
    buyProviders?.length && {
      key: 'buy',
      label: 'Buy',
      Icon: BuyIcon,
      onClick: () => router.push(routes.wallet.buyCrypto()),
    },
    swapProviders?.length && {
      key: 'swap',
      label: 'Swap',
      Icon: SwapIcon,
      onClick: () => router.push(routes.wallet.swap()),
    },
  ].filter(Boolean);

  return (
    <>
      <main className={s.page}>
        <div className={s.glow} aria-hidden='true' />
        <div className={s.topBar}>
          <GeneralButton
            variant='unstyled'
            className={s.iconButton}
            aria-label='Back'
            onClick={() => router.back()}>
            <ChevronLeftIcon size={24} />
          </GeneralButton>
          <GeneralButton
            variant='unstyled'
            className={s.walletPill}
            aria-haspopup='dialog'
            onClick={() => setSwitcherOpen(true)}>
            <span className={s.walletPillAvatar}>
              {walletName[0].toUpperCase()}
            </span>
            <span className={s.walletPillName}>{walletName}</span>
            <ChevronDownIcon size={16} className={s.walletPillChevron} />
          </GeneralButton>
          {showMenu ? (
            <div className={s.menu}>
              <SendPopOver
                isBitcoin={isBitcoin}
                isDeriveAddressChain={
                  isDeriveAddressChain && !isImportWithPrivateKey
                }
              />
            </div>
          ) : (
            <span className={s.iconSpacer} aria-hidden='true' />
          )}
        </div>

        <div className={s.column}>
          {isLoading ? (
            <div className={s.loading}>
              <Loading />
            </div>
          ) : (
            <>
              <section className={s.hero} aria-label='Balance'>
                <span className={s.heroIcon}>
                  <CoinIcon item={currentCoin} />
                </span>
                <span className={s.heroName}>
                  <span className={s.coinName}>{currentCoin?.name}</span>
                  {symbol ? <span className={s.chip}>{symbol}</span> : null}
                  {showNetwork && currentCoin?.chain_display_name ? (
                    <span className={s.chip}>
                      {currentCoin.chain_display_name}
                    </span>
                  ) : null}
                </span>
                <p className={s.balance}>
                  {currentCoin?.totalAmount}{' '}
                  <span className={s.balanceSymbol}>{symbol}</span>
                </p>
                <p className={s.fiat}>
                  {currencySymbol[localCurrency] || ''}
                  {currentCoin?.totalCourse}
                </p>
              </section>

              <div
                className={s.actions}
                style={{'--action-count': quickActions.length}}>
                {quickActions.map(({key, label, Icon, onClick}) => (
                  <GeneralButton
                    key={key}
                    variant='unstyled'
                    className={s.action}
                    onClick={onClick}>
                    <span className={s.actionIcon}>
                      <Icon size={20} />
                    </span>
                    <span className={s.actionLabel}>{label}</span>
                  </GeneralButton>
                ))}
              </div>

              {showAddAddressesNotice ? (
                <div className={s.notice}>
                  <InfoIcon size={20} className={s.noticeIcon} />
                  <p className={s.noticeText}>
                    <strong>Want more addresses?</strong> Add extra EVM, SOL and
                    TRX addresses under this wallet.
                  </p>
                  <GeneralButton
                    variant='unstyled'
                    className={s.noticeAction}
                    onClick={onPressAddAddresses}>
                    Add
                  </GeneralButton>
                  <GeneralButton
                    variant='unstyled'
                    className={s.noticeClose}
                    aria-label='Dismiss'
                    onClick={onPressAddressClose}>
                    <CloseIcon size={14} />
                  </GeneralButton>
                </div>
              ) : null}

              <section className={s.card} aria-label='Your address'>
                <div className={s.cardHead}>
                  <span className={s.label}>Your address</span>
                  {showAddressSelector ? (
                    <GeneralButton
                      variant='unstyled'
                      className={s.addressPicker}
                      aria-haspopup='dialog'
                      onClick={openAddressPicker}>
                      {selectedAddressIndex >= 0
                        ? `Address ${selectedAddressIndex + 1} of ${
                            deriveAddresses.length
                          }`
                        : 'Change address'}
                      <ChevronDownIcon size={13} />
                    </GeneralButton>
                  ) : null}
                </div>
                <p className={s.address}>{currentCoin?.address || ''}</p>
                <div className={s.cardFoot}>
                  <span className={s.meta}>
                    {selectedDeriveAddressItem?.derivePath ? (
                      <span className={s.path}>
                        {selectedDeriveAddressItem.derivePath}
                      </span>
                    ) : null}
                    <AddressTypeBadge
                      chain_name={currentCoin?.chain_name}
                      item={selectedDeriveAddressItem}
                    />
                  </span>
                  <span className={s.addressActions}>
                    <GeneralButton
                      variant='unstyled'
                      className={`${s.outlineButton} ${
                        addressCopied ? s.copyDone : ''
                      }`}
                      aria-label='Copy address'
                      onClick={onCopyAddress}>
                      {addressCopied ? (
                        <CheckIcon size={14} />
                      ) : (
                        <CopyIcon size={14} />
                      )}
                      <span>{addressCopied ? 'Copied' : 'Copy'}</span>
                    </GeneralButton>
                    <GeneralButton
                      variant='unstyled'
                      className={`${s.outlineButton} ${s.qrButton}`}
                      aria-label='Show QR code'
                      onClick={() => router.push(routes.coin.receiveFunds())}>
                      <QrIcon size={15} />
                    </GeneralButton>
                  </span>
                </div>
              </section>

              <div className={s.glassRow}>
                <ActionRow
                  icon={<HistoryIcon size={19} />}
                  title='Transaction history'
                  hint={`Sent and received ${symbol} for this address`}
                  onClick={() => router.push(routes.coin.transactions())}
                />
              </div>

              {isStaking ? (
                <div className={s.glassRow}>
                  <ActionRow
                    icon={<StakingIcon size={19} />}
                    tone='toneSuccess'
                    title='Staking'
                    hint='Stake and manage your rewards'
                    onClick={() => router.push(routes.coin.stakingList())}
                  />
                </div>
              ) : null}

              {showPrivateKey || showDelegation ? (
                <section className={s.advanced} aria-label='Advanced'>
                  <span className={`${s.label} ${s.advancedLabel}`}>
                    Advanced
                  </span>
                  {showPrivateKey ? (
                    <ActionRow
                      icon={<KeyIcon size={17} />}
                      tone='toneNeutral'
                      title='Copy private key'
                      hint='Asks for your password · never share it'
                      onClick={() => setShowConfirmModal(true)}
                    />
                  ) : null}
                  {showDelegation ? (
                    <ActionRow
                      icon={
                        delegationLoading ? (
                          <span className={s.spinner} />
                        ) : (
                          <UnlinkIcon size={17} />
                        )
                      }
                      tone='toneDanger'
                      title='Remove delegation'
                      hint={
                        delegationLoading
                          ? 'Removing delegation…'
                          : 'Revoke smart-account (EIP-7702) code on this address'
                      }
                      chevron={false}
                      onClick={() =>
                        !delegationLoading && setDelegationModalVisible(true)
                      }
                    />
                  ) : null}
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>
      <WalletSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
      <ModalConfirmTransaction
        hideModal={() => {
          setShowConfirmModal(false);
        }}
        visible={showConfirmModal}
        onSuccess={onSuccessOfPrivateKey}
      />
      {showDelegation ? (
        <ModalDelegation
          visible={delegationModalVisible}
          onClose={() => setDelegationModalVisible(false)}
          onConfirm={onRevokeDelegation}
        />
      ) : null}
      {!isLoading && (
        <ModalUnclaimedDeposit
          visible={modalUnclaimDepositVisible}
          hideModal={hideModal}
        />
      )}
      <AddressSelectorSheet
        ref={addressSheetRef}
        onSelect={onChangeSelectedAddress}
      />
    </>
  );
};

export default SendScreen;
