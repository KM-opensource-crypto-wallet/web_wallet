'use client';
import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {showToast} from 'utils/toast';
import s from './TransactionDetails.module.css';
import GeneralButton from 'components/Button';
import {CheckIcon, ChevronLeftIcon, CopyIcon} from 'components/Home/HomeIcons';
import {EmptyIcon, ExternalLinkIcon} from 'components/Transactions/TxIcons';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import useTransaction from 'src/hooks/protectedRoutes/wallet/home/send/useTransaction';

// Shortened value with a copy button; the full value goes to the clipboard.
const CopyValue = ({value}) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const stringValue = typeof value === 'string' ? value : undefined;
  const handleCopy = () => {
    if (!stringValue) return;
    navigator.clipboard?.writeText(stringValue).then(() => {
      showToast({type: 'successToast', title: 'Copied to clipboard'});
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type='button'
      className={`${s.copyValue} ${copied ? s.copyDone : ''}`}
      title={stringValue}
      onClick={handleCopy}>
      <span className={s.mono}>{getCustomizePublicAddress(stringValue)}</span>
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
    </button>
  );
};

const TransactionDetails = () => {
  const {
    goBack,
    transaction,
    transactionDetails,
    refreshing,
    nftImageError,
    onNftImageError,
  } = useTransaction('details');

  const topBar = (title, onViewExplorer) => (
    <div className={s.topBar}>
      <GeneralButton
        variant='unstyled'
        className={s.iconButton}
        aria-label='Back'
        onClick={goBack}>
        <ChevronLeftIcon size={24} />
      </GeneralButton>
      <h1 className={s.title}>{title}</h1>
      {refreshing ? (
        <span className={s.refreshing} aria-label='Refreshing' />
      ) : onViewExplorer ? (
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='View on explorer'
          onClick={onViewExplorer}>
          <ExternalLinkIcon size={19} />
        </GeneralButton>
      ) : (
        <span className={s.iconSpacer} aria-hidden='true' />
      )}
    </div>
  );

  if (!transaction) {
    return (
      <main className={s.page}>
        <div className={s.glow} aria-hidden='true' />
        {topBar('Transaction details')}
        <div className={s.column}>
          <div className={s.empty}>
            <span className={s.emptyIcon}>
              <EmptyIcon size={26} />
            </span>
            <p className={s.emptyTitle}>No transaction data found</p>
            <p className={s.emptyText}>
              It may still be propagating. Pull it up again from the transaction
              history in a moment.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const {
    hero,
    rows,
    list,
    status,
    statusLabel,
    pageTitle,
    onViewExplorer,
    showImage,
  } = transactionDetails;

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      {topBar(pageTitle, onViewExplorer)}
      <div className={s.column}>
        <section className={s.hero} aria-label='Summary'>
          {showImage ? (
            <div className={s.nftImage}>
              {hero.image && !nftImageError ? (
                <Image
                  src={hero.image}
                  alt='NFT'
                  fill
                  style={{objectFit: 'cover'}}
                  onError={onNftImageError}
                />
              ) : (
                <span className={s.nftPlaceholder}>NFT</span>
              )}
            </div>
          ) : (
            <span className={`${s.heroIcon} ${s[hero.tone]}`}>
              <hero.Icon size={26} />
            </span>
          )}
          <span className={s.heroTitle}>{hero.title}</span>
          {hero.amount ? (
            <span
              className={`${s.amount} ${
                hero.amountTone ? s[hero.amountTone] : ''
              }`}>
              {hero.amount}
            </span>
          ) : null}
          {hero.fiat ? <span className={s.fiat}>{hero.fiat}</span> : null}
          {hero.sub ? <span className={s.heroSub}>{hero.sub}</span> : null}
          <span className={`${s.status} ${s[`status_${status}`]}`}>
            <span className={s.statusDot} />
            {statusLabel}
          </span>
        </section>

        {list ? (
          <section className={s.card} aria-label={list.title}>
            <span className={s.cardTitle}>{list.title}</span>
            {list.items.map(item => (
              <div key={item.key} className={s.listItem}>
                <span className={s.listText}>
                  <span className={s.listPrimary}>{item.primary}</span>
                  {item.secondary ? (
                    <span className={s.listSecondary}>{item.secondary}</span>
                  ) : null}
                </span>
                <span className={s.listValue}>{item.value}</span>
              </div>
            ))}
          </section>
        ) : null}

        <section className={s.card} aria-label='Transaction details'>
          <span className={s.cardTitle}>Details</span>
          {rows.map(row => (
            <div key={row.label} className={s.row}>
              <span className={s.rowLabel}>{row.label}</span>
              {row.copy ? (
                <CopyValue value={row.copy} />
              ) : (
                <span className={s.rowValue}>{row.value}</span>
              )}
            </div>
          ))}
        </section>

        {onViewExplorer ? (
          <GeneralButton
            variant='secondary'
            fullWidth
            className={s.explorer}
            onClick={onViewExplorer}>
            <ExternalLinkIcon size={17} />
            View on explorer
          </GeneralButton>
        ) : null}
      </div>
    </main>
  );
};

export default TransactionDetails;
