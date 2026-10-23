'use client';

import React from 'react';
import {CircularProgress, TextField} from '@mui/material';
import GeneralButton from 'components/Button';
import WalletSwitcher from 'components/Home/WalletSwitcher';
import {readHideBalances} from 'src/hooks/protectedRoutes/wallet/home/useHome';
import {ChevronDownIcon, HistoryIcon} from 'components/Home/HomeIcons';

import s from './Exchange.module.css';

import DokDropdown from 'components/DokDropdown';
import ModalAddCoins from 'components/ModalAddCoins';
import ModalAllowanceInfo from 'components/ModalAllowanceInfo';
import ModalPermitInfo from 'components/ModalPermitInfo';
import SwapCard from './components/SwapCard';
import FlipButton from './components/FlipButton';
import AmountChips from './components/AmountChips';
import CoinSelectorSheet from './components/CoinSelectorSheet';
import ProviderList from './components/ProviderList';
import SlippageEditor from './components/SlippageEditor';
import useSwap from 'src/hooks/protectedRoutes/wallet/swap/useSwap';
import Screen from 'components/Screen';

const Exchange = () => {
  const {
    walletName,
    switcherOpen,
    openSwitcher,
    closeSwitcher,
    goToSwapHistory,
    localCurrency,
    selectedCoinFromOptions,
    selectedCoinToOptions,
    selectedFromAsset,
    selectedToAsset,
    amountFrom,
    fromFiatValue,
    toFiatValue,
    toAmountDisplay,
    balanceText,
    fromBalanceLoading,
    handleAmountChange,
    showAmountChips,
    onSelectFraction,
    onFlip,
    isQuoteFetching,
    coinSelectorSheetRef,
    openFromCoinSelector,
    openToCoinSelector,
    coinOptions,
    onSelectCoin,
    isMinimumValueGreater,
    minimumValue,
    isBalanceLess,
    disabledReason,
    possibleFromCoin,
    onSelectFromAsset,
    possibleToCoins,
    onSelectToAsset,
    customOption,
    customAddress,
    onCustomAddressChange,
    modalAddCoinsVisible,
    setModalAddCoinsVisible,
    openAddCoins,
    selectedExchangeChain,
    showSlippage,
    slippage,
    backendSlippage,
    onCommitSlippage,
    providerRows,
    quoteError,
    onRefreshQuotes,
    onPressProvider,
    fiatSymbol,
    quoteFetchedAt,
    refreshPaused,
    exchangeProvidersText,
    isButtonDisabled,
    isPreparingAllowance,
    showApproveAndSwap,
    handleSubmit,
    isSwapApprovalAsset,
    isERC20FromAsset,
    allowanceModalVisible,
    closeAllowanceModal,
    exchangeApproveLoading,
    onAllowanceContinue,
    permitModalVisible,
    closePermitModal,
    exchangePermitApproveLoading,
    onPermitAllowanceContinue,
  } = useSwap('swap');
  const center = (
    <GeneralButton
      variant='unstyled'
      className={s.heading}
      aria-haspopup='dialog'
      onClick={openSwitcher}>
      <h1 className={s.headingTitle}>Swap</h1>
      <span className={s.headingSub}>
        <span className={s.walletAvatar}>{walletName[0].toUpperCase()}</span>
        <span className={s.headingSubText}>{walletName}</span>
        <ChevronDownIcon size={12} className={s.headingChevron} />
      </span>
    </GeneralButton>
  );

  const right = (
    <GeneralButton
      variant='unstyled'
      className={s.iconButton}
      aria-label='Swap history'
      onClick={goToSwapHistory}>
      <HistoryIcon size={21} />
    </GeneralButton>
  );

  return (
    <Screen className={s.page} center={center} right={right}>
      <div className={s.container}>
        <SwapCard
          label='You pay'
          coinOption={selectedCoinFromOptions}
          amount={amountFrom}
          fiatValue={fromFiatValue}
          balanceText={balanceText}
          priceChange={selectedFromAsset?.priceChange24h}
          isBalanceFetching={fromBalanceLoading}
          editable={true}
          onChangeAmount={handleAmountChange}
          onPressCoin={openFromCoinSelector}
          hasError={isBalanceLess}>
          {showAmountChips && (
            <AmountChips
              onSelectFraction={onSelectFraction}
              disabled={fromBalanceLoading}
            />
          )}
        </SwapCard>
        <FlipButton onPress={onFlip} />
        <SwapCard
          label='You receive (estimated)'
          coinOption={selectedCoinToOptions}
          amount={toAmountDisplay}
          fiatValue={toFiatValue}
          editable={false}
          onPressCoin={openToCoinSelector}
          isFetching={isQuoteFetching}
        />
        {isMinimumValueGreater && (
          <p className={s.errorText}>
            {`Minimum for ${
              selectedExchangeChain?.title || 'this provider'
            } is ${minimumValue} ${selectedFromAsset?.symbol || ''}`}
          </p>
        )}
        {isBalanceLess && (
          <p className={s.errorText}>
            {`You don't have ${amountFrom} ${selectedFromAsset?.symbol || ''}`}
          </p>
        )}
        {possibleFromCoin?.length > 1 && (
          <div className={s.addressView}>
            <h3 className={s.addressTitle}>Pay from address</h3>
            <DokDropdown
              key={selectedFromAsset?.address}
              placeholder={'Pay from address'}
              listData={possibleFromCoin}
              onValueChange={onSelectFromAsset}
              value={selectedFromAsset?.address}
            />
          </div>
        )}
        {!!possibleToCoins?.length && (
          <div className={s.addressView}>
            <h3 className={s.addressTitle}>Receive to address</h3>
            <DokDropdown
              key={customOption || selectedToAsset?.address}
              placeholder={'Receive to address'}
              listData={possibleToCoins}
              onValueChange={onSelectToAsset}
              value={customOption || selectedToAsset?.address}
            />
          </div>
        )}
        {customOption === 'Custom' && (
          <TextField
            style={{width: '100%', marginTop: 14}}
            label='To Address'
            placeholder={'Enter to address'}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                backgroundColor: 'var(--sw-field)',
              },
              '& fieldset': {
                borderColor: 'var(--sw-field-border) !important',
              },
              '& .MuiInputBase-input': {
                color: 'var(--sw-ink)',
              },
            }}
            name='To Address'
            autoFocus={true}
            onChange={onCustomAddressChange}
            value={customAddress}
            slotProps={{
              inputLabel: {style: {color: 'var(--sw-muted)'}},
            }}
          />
        )}
        <p className={s.addCoinText}>
          {'Looking for more coins?'}
          <button
            type='button'
            className={s.addCoinLink}
            onClick={openAddCoins}>
            {' Add coins to this wallet'}
          </button>
        </p>
        {showSlippage && (
          <div className={s.detailsCard}>
            <SlippageEditor
              slippage={slippage}
              backendSlippage={backendSlippage}
              onCommit={onCommitSlippage}
            />
          </div>
        )}
        <ProviderList
          rows={providerRows}
          isFetching={isQuoteFetching}
          error={quoteError}
          onRetry={onRefreshQuotes}
          onPressProvider={onPressProvider}
          fromSymbol={selectedFromAsset?.symbol?.toUpperCase()}
          toSymbol={selectedToAsset?.symbol?.toUpperCase()}
          fiatSymbol={fiatSymbol}
          quoteFetchedAt={quoteFetchedAt}
          refreshPaused={refreshPaused}
          onRefresh={onRefreshQuotes}
        />
        <div className={s.boxFooter}>
          <p className={s.footerText}>
            {`Swap services are available through third-party API provider (${exchangeProvidersText}).`}
          </p>
          {customOption === 'Custom' && (
            <p className={s.warningText}>
              {'Please ensure the custom wallet address before exchanging.'}
            </p>
          )}
          {!!disabledReason && (
            <p
              className={
                disabledReason.transient ? s.buttonHintInfo : s.buttonHintError
              }>
              {disabledReason.text}
            </p>
          )}
          <button
            type='button'
            className={s.button}
            style={{
              backgroundColor:
                isButtonDisabled || isPreparingAllowance
                  ? 'var(--disabledButton)'
                  : 'var(--background)',
            }}
            onClick={handleSubmit}
            disabled={isButtonDisabled || isPreparingAllowance}>
            {isPreparingAllowance ? (
              <CircularProgress size={20} sx={{color: 'var(--title)'}} />
            ) : (
              <p className={s.buttonTitle}>
                {showApproveAndSwap ? 'Approve and swap' : 'Next'}
              </p>
            )}
          </button>
        </div>
        <CoinSelectorSheet
          ref={coinSelectorSheetRef}
          options={coinOptions}
          onSelect={onSelectCoin}
        />
        {modalAddCoinsVisible && (
          <ModalAddCoins
            visible={modalAddCoinsVisible}
            hideModal={setModalAddCoinsVisible}
          />
        )}
        {isSwapApprovalAsset && (
          <ModalAllowanceInfo
            visible={allowanceModalVisible}
            onClose={closeAllowanceModal}
            source='exchange'
            tokenSymbol={selectedFromAsset?.symbol}
            requiredAmount={amountFrom}
            availableAmount={selectedFromAsset?.totalAmount}
            chainName={selectedFromAsset?.chain_name}
            chainSymbol={selectedFromAsset?.chain_symbol}
            approveLoading={exchangeApproveLoading}
            onContinue={onAllowanceContinue}
          />
        )}
        {isERC20FromAsset && (
          <ModalPermitInfo
            visible={permitModalVisible}
            onClose={closePermitModal}
            tokenSymbol={selectedFromAsset?.symbol}
            requiredAmount={amountFrom}
            availableAmount={selectedFromAsset?.totalAmount}
            chainName={selectedFromAsset?.chain_name}
            chainSymbol={selectedFromAsset?.chain_symbol}
            approveLoading={exchangePermitApproveLoading}
            onContinue={onPermitAllowanceContinue}
          />
        )}
      </div>
      <WalletSwitcher
        visible={switcherOpen}
        onClose={closeSwitcher}
        hidden={switcherOpen && readHideBalances()}
        localCurrency={localCurrency}
      />
    </Screen>
  );
};

export default Exchange;
