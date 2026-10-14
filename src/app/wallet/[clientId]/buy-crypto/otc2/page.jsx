'use client';
import styles from './OTC2Screen.module.css';
import React from 'react';
import {currencySymbol} from 'src/data/lists/currency';
import {CONSENTS, amountOptions, sourceOfFundList} from 'src/data/lists/otc';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import HomeSheet from 'components/Home/HomeSheet';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import {ExternalLinkIcon} from 'components/Transactions/TxIcons';
import hs from 'components/Home/Home.module.css';
import useBuyCrypto from 'src/hooks/protectedRoutes/wallet/buyCrypto/useBuyCrypto';
import useNavigation from 'src/hooks/navigation/useNavigation';

const OTC2Screen = () => {
  const {
    localCurrency,
    isBuy,
    setIsBuy,
    selectedCryptoCoin,
    selectedAmount,
    onChangeOtcAmount,
    sourceOfFund,
    setSourceOfFund,
    otcConsents,
    toggleOtcConsent,
    isOtcDisabled,
    isOtcSubmitting,
    onOtcSubmit,
    otcCoinPickerOpen,
    openOtcCoinPicker,
    closeOtcCoinPicker,
    otcCoinQuery,
    onOtcCoinQueryChange,
    otcCoinResults,
    pickOtcCoin,
  } = useBuyCrypto();
  const {goBack} = useNavigation();

  const fiatSymbol = currencySymbol[localCurrency] || '';
  const selectedCoin = selectedCryptoCoin?.options;

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.topBar}>
        <GeneralButton
          variant='unstyled'
          className={styles.iconButton}
          aria-label='Back'
          onClick={goBack}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <h1 className={styles.title}>OTC order</h1>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>

      <div className={styles.column}>
        <div
          className={styles.segmented}
          role='radiogroup'
          aria-label='Order type'>
          {[
            {label: 'Buy Crypto', buy: true},
            {label: 'Sell Crypto', buy: false},
          ].map(option => (
            <button
              key={option.label}
              type='button'
              role='radio'
              aria-checked={isBuy === option.buy}
              className={`${styles.segment} ${
                isBuy === option.buy ? styles.segmentActive : ''
              }`}
              onClick={() => setIsBuy(option.buy)}>
              {option.label}
            </button>
          ))}
        </div>

        <section className={styles.card} aria-label='Order details'>
          <div className={styles.field}>
            <span className={styles.fieldLabel} id='otc-coin-label'>
              Crypto
            </span>
            <button
              type='button'
              className={styles.coinButton}
              aria-haspopup='dialog'
              aria-labelledby='otc-coin-label'
              onClick={openOtcCoinPicker}>
              {selectedCoin ? (
                <>
                  <span className={styles.coinIcon}>
                    <CoinIcon item={selectedCoin} />
                  </span>
                  <span className={styles.coinText}>
                    <span className={styles.coinSymbol}>
                      {selectedCoin.symbol || selectedCoin.title}
                      {selectedCoin.chain_display_name ? (
                        <span className={styles.network}>
                          {selectedCoin.chain_display_name}
                        </span>
                      ) : null}
                    </span>
                    {selectedCoin.symbol ? (
                      <span className={styles.coinName}>
                        {selectedCoin.title}
                      </span>
                    ) : null}
                  </span>
                </>
              ) : (
                <span className={styles.placeholder}>Select Crypto</span>
              )}
              <ChevronDownIcon size={18} className={styles.chevron} />
            </button>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel} id='otc-amount-label'>
              Amount ({localCurrency})
            </span>
            <div
              className={styles.chips}
              role='radiogroup'
              aria-labelledby='otc-amount-label'>
              {amountOptions.map(item => (
                <button
                  key={item.value}
                  type='button'
                  role='radio'
                  aria-checked={selectedAmount === item.value}
                  className={`${styles.chip} ${
                    selectedAmount === item.value ? styles.chipActive : ''
                  }`}
                  onClick={() => onChangeOtcAmount(item.value)}>
                  {fiatSymbol}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel} id='otc-source-label'>
              Source of funds
            </span>
            <div
              className={styles.chips}
              role='radiogroup'
              aria-labelledby='otc-source-label'>
              {sourceOfFundList.map(item => (
                <button
                  key={item.label}
                  type='button'
                  role='radio'
                  aria-checked={sourceOfFund === item.label}
                  className={`${styles.chip} ${
                    sourceOfFund === item.label ? styles.chipActive : ''
                  }`}
                  onClick={() => setSourceOfFund(item.label)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby='otc-consent'>
          <h2 className={styles.sectionLabel} id='otc-consent'>
            Agreements
          </h2>
          <p className={styles.provider}>
            This service is provided by ozaraglobal.com.
          </p>
          <div className={styles.consentCard}>
            {CONSENTS.map(consent => {
              const checked = otcConsents[consent.key];
              return (
                <div key={consent.key} className={styles.consent}>
                  <button
                    type='button'
                    role='checkbox'
                    aria-checked={checked}
                    aria-label={`I accept the ${consent.label}`}
                    className={`${styles.tick} ${checked ? styles.tickOn : ''}`}
                    onClick={() => toggleOtcConsent(consent.key)}>
                    {checked ? <CheckIcon size={13} strokeWidth={3} /> : null}
                  </button>
                  <span className={styles.consentText}>
                    I accept the{' '}
                    <a
                      href={consent.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className={styles.consentLink}>
                      {consent.label}
                      <ExternalLinkIcon size={12} />
                    </a>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <GeneralButton
          fullWidth
          disabled={isOtcDisabled}
          loading={isOtcSubmitting}
          loadingLabel='Submitting…'
          onClick={onOtcSubmit}>
          Next
        </GeneralButton>
      </div>

      <HomeSheet
        visible={otcCoinPickerOpen}
        onClose={closeOtcCoinPicker}
        title={isBuy ? 'Buy which coin?' : 'Sell which coin?'}
        labelId='otc-coin-picker-title'>
        <label className={hs.sheetSearch}>
          <SearchIcon size={17} />
          <input
            autoFocus={true}
            value={otcCoinQuery}
            onChange={onOtcCoinQueryChange}
            placeholder='Search coins'
            aria-label='Search coins'
          />
        </label>
        <div className={hs.pickerList} role='listbox' aria-label='Coins'>
          {otcCoinResults.map(item => {
            const active = item.value === selectedCryptoCoin?.value;
            return (
              <button
                key={item.value}
                type='button'
                role='option'
                aria-selected={active}
                className={`${styles.option} ${
                  active ? styles.optionActive : ''
                }`}
                onClick={() => pickOtcCoin(item.value)}>
                <span className={styles.coinIcon}>
                  <CoinIcon item={item.options} />
                </span>
                <span className={styles.coinText}>
                  <span className={styles.optionTitle}>
                    {item.options?.symbol || item.options?.title}
                    {item.options?.chain_display_name ? (
                      <span className={styles.optionNetwork}>
                        {item.options.chain_display_name}
                      </span>
                    ) : null}
                  </span>
                  {item.options?.symbol ? (
                    <span className={styles.optionHint}>
                      {item.options?.title}
                    </span>
                  ) : null}
                </span>
                {active ? (
                  <CheckIcon size={18} className={styles.optionCheck} />
                ) : null}
              </button>
            );
          })}
          {otcCoinResults.length === 0 ? (
            <p className={hs.sheetEmpty}>No coins found</p>
          ) : null}
        </div>
      </HomeSheet>
    </main>
  );
};

export default OTC2Screen;
