'use client';
import React, {useState} from 'react';
import {useSelector} from 'react-redux';
import QRCode from 'react-qr-code';
import useReceiveFunds from 'src/hooks/protectedRoutes/wallet/home/send/useReceiveFunds';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import {selectCurrentWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  CopyIcon,
  InfoIcon,
} from 'components/Home/HomeIcons';
import s from './RecieveFunds.module.css';

// Read-only value with a copy button; used for the address and, on Hedera,
// the ledger account id.
const CopyField = ({label, value, copied, onCopy, copyLabel}) => (
  <div className={s.field}>
    <span className={s.fieldLabel}>{label}</span>
    <div className={s.fieldRow}>
      <p className={s.fieldValue}>{value}</p>
      <GeneralButton
        variant='unstyled'
        className={`${s.copy} ${copied ? s.copyDone : ''}`}
        aria-label={copyLabel}
        onClick={onCopy}>
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </GeneralButton>
    </div>
  </div>
);

const ReceiveFunds = () => {
  const {
    coin,
    symbol,
    networkName,
    goBack,
    qrValue,
    address,
    copyAddress,
    addressCopied,
    isLightning,
    lightningModes,
    lightningMode,
    selectLightningMode,
    generating,
    generateError,
    showOnChainNote,
    isHedera,
    hederaAccountId,
    copyAccountId,
    accountIdCopied,
  } = useReceiveFunds();
  const currentWallet = useSelector(selectCurrentWallet);
  const localCurrency = useSelector(getLocalCurrency);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const walletName = currentWallet?.walletName || 'Wallet';

  return (
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
          className={s.heading}
          aria-haspopup='dialog'
          onClick={() => setSwitcherOpen(true)}>
          <h1 className={s.headingTitle}>Receive {symbol}</h1>
          <span className={s.headingSub}>
            <span className={s.walletAvatar}>
              {walletName[0].toUpperCase()}
            </span>
            <span className={s.headingSubText}>{walletName}</span>
            <ChevronDownIcon size={12} className={s.headingChevron} />
          </span>
        </GeneralButton>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

      <div className={s.column}>
        <div className={s.coinChip}>
          <span className={s.coinIcon}>
            <CoinIcon item={coin} />
          </span>
          <span className={s.coinName}>{coin?.name}</span>
          {networkName ? (
            <span className={s.network}>{networkName}</span>
          ) : null}
        </div>

        {isLightning ? (
          <div
            className={s.segmented}
            role='radiogroup'
            aria-label='Receive method'>
            {lightningModes.map(({value, label}) => (
              <GeneralButton
                key={value}
                variant='unstyled'
                role='radio'
                aria-checked={lightningMode === value}
                className={`${s.segment} ${
                  lightningMode === value ? s.segmentActive : ''
                }`}
                disabled={generating}
                onClick={() => selectLightningMode(value)}>
                {label}
              </GeneralButton>
            ))}
          </div>
        ) : null}

        {showOnChainNote ? (
          <p className={`${s.note} ${s.noteWarning}`}>
            <InfoIcon size={16} />
            <span>
              On-chain BTC deposits need 4 confirmations before the balance is
              available. You will need to claim the deposit manually once it is
              confirmed.
            </span>
          </p>
        ) : null}

        <section className={s.card} aria-label={`${symbol} receive address`}>
          <div className={s.qrStage}>
            <div className={s.qrTile} aria-busy={generating}>
              <span className={s.corners} aria-hidden='true' />
              {generating ? (
                <span className={s.spinner} aria-label='Creating address' />
              ) : address ? (
                <>
                  <QRCode
                    value={qrValue}
                    size={320}
                    level='H'
                    bgColor='#ffffff'
                    fgColor='#1a1613'
                    className={s.qr}
                  />
                  <span className={s.qrLogo} aria-hidden='true'>
                    <CoinIcon item={coin} />
                  </span>
                </>
              ) : null}
            </div>
            <p className={s.qrCaption}>Scan to send {symbol} to this wallet</p>
          </div>

          {generateError ? (
            <p className={s.error} role='alert'>
              {generateError}
            </p>
          ) : null}

          <CopyField
            label={`Your ${symbol} address`}
            value={generating ? 'Creating address…' : address}
            copied={addressCopied}
            onCopy={copyAddress}
            copyLabel='Copy address'
          />

          {isHedera ? (
            hederaAccountId ? (
              <CopyField
                label='Account ID'
                value={hederaAccountId}
                copied={accountIdCopied}
                onCopy={copyAccountId}
                copyLabel='Copy account ID'
              />
            ) : (
              <div className={s.field}>
                <span className={s.fieldLabel}>Account ID</span>
                <p className={s.fieldHint}>
                  Assigned automatically after your first HBAR deposit. Anyone
                  can send HBAR to the address above; the sender covers the
                  one-time account creation fee.
                </p>
              </div>
            )
          ) : null}
        </section>

        <p className={s.note}>
          <InfoIcon size={16} />
          <span>
            Only send {symbol}
            {networkName ? ` on ${networkName}` : ''} to this address. Other
            assets may be lost.
          </span>
        </p>
      </div>
      <WalletSwitcher
        visible={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </main>
  );
};

export default ReceiveFunds;
