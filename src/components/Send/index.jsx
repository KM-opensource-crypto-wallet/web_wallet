import React from 'react';
import {currencySymbol} from 'data/currency';
import useSend from 'src/hooks/protectedRoutes/wallet/home/send/useSend';

import s from './Send.module.css';

import Loading from 'components/Loading';
import CoinIcon from 'components/CoinIcon';
import PriceChange from 'components/PriceChange';
import GeneralButton from 'components/Button';
import {
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
  StakingIcon,
  UnlinkIcon,
} from 'components/Home/HomeIcons';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import ModalDelegation from 'components/ModalDelegation';
import AddressSelectorSheet from 'components/AddressSelectorSheet';
import AddressTypeBadge from 'components/AddressTypeBadge';
import SendPopOver from 'components/SendPopOver';
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
  const {
    goBack,
    walletName,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    showMenu,
    isBitcoin,
    isDeriveAddressChain,
    isImportWithPrivateKey,
    isLoading,
    currentCoin,
    localCurrency,
    symbol,
    showNetwork,
    quickActions,
    showAddAddressesNotice,
    onPressAddAddresses,
    onPressAddressClose,
    showAddressSelector,
    selectedAddressIndex,
    deriveAddresses,
    selectedDeriveAddressItem,
    openAddressPicker,
    addressSheetRef,
    onChangeSelectedAddress,
    addressCopied,
    onCopyAddress,
    goToReceive,
    goToTransactions,
    isStaking,
    goToStakingList,
    showPrivateKey,
    showConfirmModal,
    openConfirmModal,
    closeConfirmModal,
    onSuccessOfPrivateKey,
    showDelegation,
    delegationLoading,
    delegationModalVisible,
    openDelegationModal,
    closeDelegationModal,
    onRevokeDelegation,
    modalUnclaimDepositVisible,
    hideModal,
  } = useSend('coin');

  return (
    <>
      <main className={s.page}>
        <div className={s.glow} aria-hidden='true' />
        <div className={s.topBar}>
          <GeneralButton
            variant='unstyled'
            className={s.iconButton}
            aria-label='Back'
            onClick={goBack}>
            <ChevronLeftIcon size={24} />
          </GeneralButton>
          <GeneralButton
            variant='unstyled'
            className={s.walletPill}
            aria-haspopup='dialog'
            onClick={openSwitcher}>
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
                  <PriceChange
                    value={currentCoin?.priceChange24h}
                    className={s.heroChange}
                  />
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
                      onClick={goToReceive}>
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
                  onClick={goToTransactions}
                />
              </div>

              {isStaking ? (
                <div className={s.glassRow}>
                  <ActionRow
                    icon={<StakingIcon size={19} />}
                    tone='toneSuccess'
                    title='Staking'
                    hint='Stake and manage your rewards'
                    onClick={goToStakingList}
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
                      onClick={openConfirmModal}
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
                      onClick={openDelegationModal}
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
        onClose={closeSwitcher}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
      <ModalConfirmTransaction
        hideModal={closeConfirmModal}
        visible={showConfirmModal}
        onSuccess={onSuccessOfPrivateKey}
      />
      {showDelegation ? (
        <ModalDelegation
          visible={delegationModalVisible}
          onClose={closeDelegationModal}
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
