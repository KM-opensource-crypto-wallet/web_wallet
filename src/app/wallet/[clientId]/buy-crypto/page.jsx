'use client';
import React from 'react';
import {Formik} from 'formik';
import styles from './CryptoProviders.module.css';
import Image from 'next/image';
import {validateNumberInInput} from 'dok-wallet-blockchain-networks/helper';
import {currencySymbol} from 'data/currency';
import GeneralButton from 'components/Button';
import HomeSheet from 'components/Home/HomeSheet';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  InfoIcon,
  PlusIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import Loading from 'components/Loading';
import ModalAddCoins from 'components/ModalAddCoins';
import useBuyCrypto from 'src/hooks/protectedRoutes/wallet/buyCrypto/useBuyCrypto';

const PRESETS = ['100', '250', '500'];

const RefreshIcon = props => (
  <svg
    width={13}
    height={13}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.4'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
    {...props}>
    <path d='M21 12a9 9 0 1 1-3-6.7' />
    <path d='M21 4v5h-5' />
  </svg>
);

const formatNumber = (value, max = 6) =>
  Number(value).toLocaleString('en-US', {maximumFractionDigits: max});

const CryptoProviders = () => {
  const {
    goBack,
    walletName,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    localCurrency,
    formikRef,
    initialValues,
    amountValidation,
    onSubmit,
    eurOnly,
    changeAmount,
    cycleCurrency,
    coinSheetOpen,
    openCoinSheet,
    closeCoinSheet,
    coinQuery,
    onCoinQueryChange,
    coinList,
    pickCoin,
    openAddCoins,
    addressCopied,
    copyAddress,
    isLoading,
    quotes,
    activeQuote,
    pickQuote,
    refreshQuote,
    loadingIndex,
    continueWithActiveQuote,
    modalAddCoinsVisible,
    setModalAddCoinsVisible,
  } = useBuyCrypto();

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
        <GeneralButton
          variant='unstyled'
          className={styles.heading}
          aria-haspopup='dialog'
          onClick={openSwitcher}>
          <h1 className={styles.headingTitle}>Buy</h1>
          <span className={styles.headingSub}>
            <span className={styles.walletAvatar}>
              {walletName[0].toUpperCase()}
            </span>
            <span className={styles.headingSubText}>{walletName}</span>
            <ChevronDownIcon size={12} className={styles.headingChevron} />
          </span>
        </GeneralButton>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>

      <Formik
        innerRef={formikRef}
        initialValues={initialValues}
        validationSchema={amountValidation}
        onSubmit={onSubmit}>
        {({handleBlur, values, errors, touched, setFieldValue}) => {
          const coin = values?.selectedCoin?.options;
          const symbol = coin?.symbol?.toUpperCase() ?? '';
          const fiatSymbol = currencySymbol[values.fiatCurrency] || '';
          const amountError = touched.amount && errors.amount;
          const coinError = touched.selectedCoin && errors.selectedCoin;
          const canQuote = !!coin && Number(values.amount) > 0;
          const showQuotes = canQuote && !isLoading && quotes.length > 0;

          const setAmount = next => changeAmount(next, values, setFieldValue);

          return (
            <div className={styles.column}>
              <div className={styles.field}>
                <label htmlFor='amount' className={styles.label}>
                  You pay
                </label>
                <div
                  className={`${styles.amountCard} ${
                    amountError ? styles.inputBoxError : ''
                  }`}>
                  <div className={styles.amountRow}>
                    <span className={styles.fiatPrefix}>{fiatSymbol}</span>
                    <input
                      id='amount'
                      className={styles.amountInput}
                      placeholder='0'
                      inputMode='decimal'
                      name='amount'
                      onChange={e =>
                        setAmount(
                          validateNumberInInput(e.target.value, coin?.decimal),
                        )
                      }
                      onBlur={handleBlur('amount')}
                      value={values.amount}
                    />
                    <button
                      type='button'
                      className={styles.currencyChip}
                      disabled={eurOnly}
                      aria-label={
                        eurOnly
                          ? `Paying in ${values.fiatCurrency}`
                          : `Paying in ${values.fiatCurrency}, change currency`
                      }
                      onClick={() => cycleCurrency(values, setFieldValue)}>
                      {values.fiatCurrency}
                      {eurOnly ? null : <ChevronDownIcon size={12} />}
                    </button>
                  </div>
                  <div className={styles.presets}>
                    {PRESETS.map(preset => (
                      <button
                        key={preset}
                        type='button'
                        className={`${styles.preset} ${
                          values.amount === preset ? styles.presetOn : ''
                        }`}
                        onClick={() => setAmount(preset)}>
                        {fiatSymbol}
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                {amountError && (
                  <p className={styles.error} role='alert'>
                    {errors.amount}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <span className={styles.label}>You get</span>
                <button
                  type='button'
                  className={`${styles.coinCard} ${
                    coinError ? styles.inputBoxError : ''
                  }`}
                  aria-haspopup='dialog'
                  onClick={openCoinSheet}>
                  <span className={styles.coinIcon}>
                    {coin?.icon ? (
                      <Image src={coin.icon} alt='' width={40} height={40} />
                    ) : (
                      <PlusIcon size={18} />
                    )}
                  </span>
                  <span className={styles.coinText}>
                    {coin ? (
                      <>
                        <span className={styles.coinGot}>
                          <span className={styles.coinAmount}>
                            {activeQuote?.hasQuote && !isLoading
                              ? `≈ ${formatNumber(activeQuote.got)}`
                              : '—'}
                          </span>
                          <span className={styles.coinSymbol}>{symbol}</span>
                        </span>
                        <span className={styles.coinMeta}>
                          {values.selectedCoin?.label}
                          {coin?.chain_display_name ? (
                            <span className={styles.chip}>
                              {coin.chain_display_name}
                            </span>
                          ) : null}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.coinPlaceholder}>
                          Select a coin
                        </span>
                        <span className={styles.coinMeta}>
                          From the coins in this wallet
                        </span>
                      </>
                    )}
                  </span>
                  <span className={styles.changeChip}>
                    {coin ? 'Change' : 'Select'}
                    <ChevronRightIcon size={12} />
                  </span>
                </button>
                {coinError && (
                  <p className={styles.error} role='alert'>
                    {errors.selectedCoin}
                  </p>
                )}
                {!!coin?.walletAddress && (
                  <div className={styles.addressRow}>
                    <span className={styles.addressLabel}>To</span>
                    <span className={styles.address} title={coin.walletAddress}>
                      {coin.walletAddress}
                    </span>
                    <button
                      type='button'
                      className={`${styles.copy} ${
                        addressCopied ? styles.copyDone : ''
                      }`}
                      aria-label='Copy address'
                      onClick={() => copyAddress(coin.walletAddress)}>
                      {addressCopied ? (
                        <CheckIcon size={14} />
                      ) : (
                        <CopyIcon size={14} />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <span className={styles.label}>Quotes</span>
                  {canQuote ? (
                    <button
                      type='button'
                      className={styles.refresh}
                      disabled={isLoading}
                      onClick={() => refreshQuote(values)}>
                      <RefreshIcon
                        className={isLoading ? styles.spinning : ''}
                      />
                      {isLoading ? 'Updating…' : 'Refresh'}
                    </button>
                  ) : null}
                </div>
                {!canQuote ? (
                  <div className={styles.quotesEmpty}>
                    {coin
                      ? 'Enter an amount to compare providers'
                      : 'Pick a coin to compare providers'}
                  </div>
                ) : isLoading ? (
                  <div className={styles.quotesLoading}>
                    <Loading />
                  </div>
                ) : !showQuotes ? (
                  <div className={styles.quotesEmpty}>
                    <strong>No providers available</strong>
                    <span>Try another coin or amount</span>
                  </div>
                ) : (
                  <div
                    className={styles.quotes}
                    role='radiogroup'
                    aria-label='Provider'>
                    {quotes.map(quote => {
                      const on = activeQuote?.key === quote.key;
                      const {item} = quote;
                      const rate =
                        quote.hasQuote && quote.got > 0
                          ? `1 ${symbol} ≈ ${fiatSymbol}${formatNumber(
                              Number(item.fromAmount) / quote.got,
                              2,
                            )}`
                          : 'Quote on the provider site';
                      return (
                        <button
                          key={quote.key}
                          type='button'
                          role='radio'
                          aria-checked={on}
                          className={`${styles.quote} ${
                            on ? styles.quoteOn : ''
                          }`}
                          onClick={() => pickQuote(quote.key)}>
                          <span className={styles.providerLogo}>
                            <Image
                              src={item.src}
                              alt=''
                              width={38}
                              height={38}
                            />
                          </span>
                          <span className={styles.quoteText}>
                            <span className={styles.quoteTitleRow}>
                              <span className={styles.quoteName}>
                                {item.title}
                              </span>
                              {quote.isBest ? (
                                <span className={styles.bestBadge}>
                                  Best rate
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.quoteSub}>{rate}</span>
                          </span>
                          <span className={styles.quoteRight}>
                            {quote.hasQuote ? (
                              <span className={styles.quoteGot}>
                                {formatNumber(quote.got)} {symbol}
                              </span>
                            ) : null}
                            {quote.diff != null ? (
                              <span className={styles.quoteDiff}>
                                {(quote.diff * 100).toFixed(2)}%
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className={styles.note}>
                <InfoIcon size={16} />
                <span>
                  You finish the purchase on the provider&apos;s site; the coins
                  are sent to the address above.
                </span>
              </p>

              <div className={styles.cta}>
                <GeneralButton
                  fullWidth
                  className={styles.ctaButton}
                  disabled={!showQuotes || !activeQuote}
                  loading={loadingIndex !== null}
                  loadingLabel='Opening provider…'
                  onClick={continueWithActiveQuote}>
                  {showQuotes && activeQuote
                    ? `Continue with ${activeQuote.item.title}`
                    : 'Continue'}
                </GeneralButton>
              </div>

              <HomeSheet
                visible={coinSheetOpen}
                onClose={closeCoinSheet}
                title='Buy which coin?'
                labelId='buy-coin-title'>
                <label className={styles.sheetSearch}>
                  <SearchIcon size={16} />
                  <input
                    value={coinQuery}
                    onChange={onCoinQueryChange}
                    placeholder='Search'
                    aria-label='Search coins'
                  />
                </label>
                <div className={styles.sheetList}>
                  {coinList.length ? (
                    coinList.map(item => {
                      const on = item.value === values?.selectedCoin?.value;
                      return (
                        <button
                          key={item.value}
                          type='button'
                          className={`${styles.sheetCoin} ${
                            on ? styles.sheetCoinOn : ''
                          }`}
                          onClick={() => pickCoin(item, values, setFieldValue)}>
                          <span className={styles.sheetCoinIcon}>
                            {item.options?.icon ? (
                              <Image
                                src={item.options.icon}
                                alt=''
                                width={34}
                                height={34}
                              />
                            ) : null}
                          </span>
                          <span className={styles.sheetCoinText}>
                            <span className={styles.sheetCoinTitle}>
                              {item.options?.symbol?.toUpperCase()}
                              {item.options?.chain_display_name ? (
                                <span className={styles.chip}>
                                  {item.options.chain_display_name}
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.sheetCoinName}>
                              {item.label}
                            </span>
                          </span>
                          {on ? <CheckIcon size={18} /> : null}
                        </button>
                      );
                    })
                  ) : (
                    <p className={styles.sheetEmpty}>No coins found</p>
                  )}
                </div>
                <button
                  type='button'
                  className={styles.sheetAdd}
                  onClick={openAddCoins}>
                  <PlusIcon size={16} />
                  Add more coins to this wallet
                </button>
              </HomeSheet>
            </div>
          );
        }}
      </Formik>

      {modalAddCoinsVisible && (
        <ModalAddCoins
          visible={modalAddCoinsVisible}
          hideModal={setModalAddCoinsVisible}
        />
      )}
      <WalletSwitcher
        visible={switcherOpen}
        onClose={closeSwitcher}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </main>
  );
};

export default CryptoProviders;
