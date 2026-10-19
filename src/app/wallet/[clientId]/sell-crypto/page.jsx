'use client';
import styles from './SellCrypto.module.css';
import {Formik} from 'formik';
import React from 'react';
import ModalAddCoins from 'src/components/ModalAddCoins';
import Loading from 'src/components/Loading';
import Image from 'next/image';
import {validateNumberInInput} from 'dok-wallet-blockchain-networks/helper';
import {currencySymbol} from 'src/data/lists/currency';
import ModalLoad from 'src/components/ModalLoad';
import GeneralButton from 'components/Button';
import HomeSheet from 'components/Home/HomeSheet';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  InfoIcon,
  PlusIcon,
  SearchIcon,
} from 'components/Home/HomeIcons';
import useSellCrypto from 'src/hooks/protectedRoutes/wallet/sellCrypto/useSellCrypto';
import Screen from 'components/Screen';
import {FormDraftSync} from 'src/hooks/useFormDraft';

const CURRENCIES = ['USD', 'EUR'];

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

const formatFiat = value =>
  Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SellCrypto = () => {
  const {
    walletName,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    localCurrency,
    formikRef,
    draftKey,
    initialValues,
    sellCryptoValidation,
    onSubmit,
    changeAmount,
    changeCurrency,
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
    continueWithActiveQuote,
    pageLoading,
    pageLoadingTitle,
    modalAddCoinsVisible,
    setModalAddCoinsVisible,
  } = useSellCrypto();

  const center = (
    <GeneralButton
      variant='unstyled'
      className={styles.heading}
      aria-haspopup='dialog'
      onClick={openSwitcher}>
      <h1 className={styles.headingTitle}>Sell</h1>
      <span className={styles.headingSub}>
        <span className={styles.walletAvatar}>
          {walletName[0].toUpperCase()}
        </span>
        <span className={styles.headingSubText}>{walletName}</span>
        <ChevronDownIcon size={12} className={styles.headingChevron} />
      </span>
    </GeneralButton>
  );

  return (
    <Screen className={styles.page} center={center}>
      <Formik
        innerRef={formikRef}
        initialValues={initialValues}
        validationSchema={sellCryptoValidation}
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
              <FormDraftSync draftKey={draftKey} />
              <div className={styles.field}>
                <label htmlFor='amount' className={styles.label}>
                  You sell
                </label>
                <div
                  className={`${styles.amountCard} ${
                    amountError || coinError ? styles.inputBoxError : ''
                  }`}>
                  <div className={styles.amountRow}>
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
                      className={styles.coinChip}
                      aria-haspopup='dialog'
                      onClick={openCoinSheet}>
                      {coin?.icon ? (
                        <span className={styles.coinChipIcon}>
                          <Image
                            src={coin.icon}
                            alt=''
                            width={24}
                            height={24}
                          />
                        </span>
                      ) : (
                        <PlusIcon size={14} />
                      )}
                      {coin ? symbol : 'Select coin'}
                      <ChevronDownIcon size={13} />
                    </button>
                  </div>
                  {coin ? (
                    <span className={styles.coinMeta}>
                      {values.selectedCoin?.label}
                      {coin?.chain_display_name ? (
                        <span className={styles.chip}>
                          {coin.chain_display_name}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                {amountError && (
                  <p className={styles.error} role='alert'>
                    {errors.amount}
                  </p>
                )}
                {coinError && (
                  <p className={styles.error} role='alert'>
                    {errors.selectedCoin || 'Please select a coin'}
                  </p>
                )}
                {!!coin?.walletAddress && (
                  <div className={styles.addressRow}>
                    <span className={styles.addressLabel}>From</span>
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
                  <span className={styles.label}>You receive</span>
                  <div
                    className={styles.segmented}
                    role='radiogroup'
                    aria-label='Currency'>
                    {CURRENCIES.map(code => (
                      <button
                        key={code}
                        type='button'
                        role='radio'
                        aria-checked={values.fiatCurrency === code}
                        className={`${styles.segment} ${
                          values.fiatCurrency === code
                            ? styles.segmentActive
                            : ''
                        }`}
                        onClick={() =>
                          changeCurrency(code, values, setFieldValue)
                        }>
                        {currencySymbol[code]} {code}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.receiveCard}>
                  <span className={styles.receiveAmount}>
                    {activeQuote?.hasQuote && !isLoading
                      ? `≈ ${fiatSymbol}${formatFiat(activeQuote.got)}`
                      : '—'}
                  </span>
                  <span className={styles.receiveHint}>
                    {activeQuote?.hasQuote && !isLoading
                      ? `via ${activeQuote.item.title}`
                      : 'Estimated payout appears with the quotes'}
                  </span>
                </div>
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
                      const amountSold = Number(item?.fromAmount);
                      const rate =
                        quote.hasQuote && amountSold > 0
                          ? `1 ${symbol} ≈ ${fiatSymbol}${formatFiat(
                              quote.got / amountSold,
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
                                  Best payout
                                </span>
                              ) : null}
                            </span>
                            <span className={styles.quoteSub}>{rate}</span>
                          </span>
                          <span className={styles.quoteRight}>
                            {quote.hasQuote ? (
                              <span className={styles.quoteGot}>
                                {fiatSymbol}
                                {formatFiat(quote.got)}
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
                  You confirm the sale on the provider&apos;s site, then send
                  the coins from this wallet on the next screen.
                </span>
              </p>

              <div className={styles.cta}>
                <GeneralButton
                  fullWidth
                  className={styles.ctaButton}
                  disabled={!showQuotes || !activeQuote || pageLoading}
                  onClick={continueWithActiveQuote}>
                  {showQuotes && activeQuote
                    ? `Continue with ${activeQuote.item.title}`
                    : 'Continue'}
                </GeneralButton>
              </div>

              <HomeSheet
                visible={coinSheetOpen}
                onClose={closeCoinSheet}
                title='Sell which coin?'
                labelId='sell-coin-title'>
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
      {pageLoading && <ModalLoad open={pageLoading} title={pageLoadingTitle} />}
      <WalletSwitcher
        visible={switcherOpen}
        onClose={closeSwitcher}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </Screen>
  );
};

export default SellCrypto;
