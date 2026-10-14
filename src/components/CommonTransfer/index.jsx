'use client';

import React from 'react';

import s from './CommonTransfer.module.css';
import ModalConfirmTransaction from 'components/ModalConfirmTransaction';
import Loading from 'components/Loading';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import CoinIcon from 'components/CoinIcon';
import GeneralButton from 'components/Button';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  SettingsIcon,
} from 'components/Home/HomeIcons';
import HomeSheet from 'components/Home/HomeSheet';
import ValidatorItem from 'components/ValidatorItem';
import BatchTransactionItem from 'components/BatchTransactionItem';
import DuplicateTransactionModal from 'components/DuplicateTransactionModal';
import AdvancedFeesSheet from 'components/AdvancedFeesSheet';
import useCommonTransfer from 'src/hooks/protectedRoutes/wallet/home/send/useCommonTransfer';
import useNavigation from 'src/hooks/navigation/useNavigation';

// One label/value line of a details card. `mono` for addresses.
const InfoRow = ({label, value, mono = false, capitalize = false}) => (
  <div className={s.row}>
    <span className={s.rowLabel}>{label}</span>
    <span
      className={`${s.rowValue} ${mono ? s.mono : ''} ${
        capitalize ? s.capitalize : ''
      }`}>
      {value}
    </span>
  </div>
);

// A glass card with an optional heading, holding InfoRows.
const DetailsCard = ({heading, children}) => (
  <section className={s.card}>
    {heading ? <h2 className={s.cardHeading}>{heading}</h2> : null}
    {children}
  </section>
);

// The amount leaving the wallet: coin icon, big amount, local-currency value.
const AmountHero = ({coin, amount, symbol, fiat, sign = '-'}) => (
  <section className={s.hero}>
    {coin ? (
      <span className={s.heroIcon}>
        <CoinIcon item={coin} />
      </span>
    ) : null}
    <span className={s.heroText}>
      <span className={s.heroAmount}>
        {sign}
        {amount || 0} <span className={s.heroSymbol}>{symbol || ''}</span>
      </span>
      <span className={s.heroFiat}>{fiat}</span>
    </span>
  </section>
);

// One end of the from -> to journey.
const PartyCard = ({label, name, sub, meta, initial, accent = false, coin}) => (
  <div className={s.party}>
    {coin ? (
      <span className={s.partyCoin}>
        <CoinIcon item={coin} />
      </span>
    ) : (
      <span className={`${s.partyAvatar} ${accent ? s.partyAvatarAccent : ''}`}>
        {(initial || name || '?').toString().slice(0, 1).toUpperCase()}
      </span>
    )}
    <span className={s.partyText}>
      <span className={s.partyLabel}>{label}</span>
      <span className={s.partyName}>{name}</span>
      {sub ? <span className={s.partySub}>{sub}</span> : null}
    </span>
    {meta ? <span className={s.partyMeta}>{meta}</span> : null}
  </div>
);

// From card, dashed connector with a short note, To card.
const Journey = ({from, to, link}) => (
  <section className={s.journey} aria-label='From and to'>
    <PartyCard label='From' accent {...from} />
    <div className={s.link}>
      <span className={s.linkLine} aria-hidden='true' />
      {link ? (
        <span className={s.linkText}>
          <ChevronDownIcon size={12} />
          {link}
        </span>
      ) : null}
    </div>
    <PartyCard label='To' {...to} />
  </section>
);

const CommonTransfer = () => {
  const {
    title,
    isLoading,
    isExchangeLoading,
    ready,
    customError,
    localCurrency,
    isSendFundScreen,
    isSellCryptoScreen,
    isExchangeScreen,
    isStakingScreen,
    isBatchTransaction,
    isCreateStaking,
    isWithdrawStaking,
    transferData,
    chainName,
    fiatValue,
    formatAddress,
    fromParty,
    toParty,
    tokenLink,
    hederaRecipientStatus,
    hederaRecipient,
    sellCryptoRequestDetails,
    selectedFromAsset,
    selectedToAsset,
    amountFrom,
    amountTo,
    exchangeToName,
    exchangeToAddress,
    selectedExchangeChain,
    showFeeTiers,
    feesOptions,
    selectedFeesType,
    selectedFeesLabel,
    advancedFeesSheetProps,
    gasCurrency,
    isEip1559,
    isCustomFeesValid,
    feeAmount,
    feeSymbol,
    isFetchingFeesAgain,
    isAdvancedOptionsOpen,
    selectCustomFees,
    openAdvancedOptions,
    closeAdvancedOptions,
    isDisabled,
    isQuoteExpired,
    showTotal,
    maxTotal,
    isSendDisabled,
    isSubmitting,
    handleSubmitForm,
    showConfirmModal,
    hideConfirmModal,
    onSuccess,
    showDuplicateModal,
    closeDuplicateModal,
  } = useCommonTransfer();
  const {goBack} = useNavigation();

  const renderSendFundUI = () => {
    const coin = transferData?.currentCoin;
    return (
      <>
        <AmountHero
          coin={coin}
          amount={transferData?.amount}
          symbol={coin?.symbol}
          fiat={fiatValue}
        />
        <Journey
          from={fromParty(coin)}
          to={toParty(transferData?.toAddress)}
          link={
            transferData?.memo
              ? `Memo: ${transferData.memo}`
              : tokenLink(coin) || coin?.chain_display_name
          }
        />
        <DetailsCard>
          <InfoRow label={'Asset'} value={`${coin?.name} (${coin?.symbol})`} />
          <InfoRow label={'Network'} value={coin?.chain_display_name} />
          {chainName === 'hedera' && (
            <>
              {!!coin?.accountId && (
                <InfoRow label={'Account ID'} value={coin.accountId} mono />
              )}
              <InfoRow
                label={'To account ID'}
                value={
                  hederaRecipientStatus === 'resolving'
                    ? 'Resolving…'
                    : hederaRecipientStatus === 'error'
                      ? 'Unavailable'
                      : hederaRecipient?.accountId || 'New account'
                }
              />
            </>
          )}
        </DetailsCard>
      </>
    );
  };

  const renderSellCryptoUI = () => {
    const coin = transferData?.currentCoin;
    return (
      <>
        <AmountHero
          coin={coin}
          amount={transferData?.amount}
          symbol={coin?.symbol}
          fiat={fiatValue}
        />
        <Journey
          from={fromParty(coin)}
          to={toParty(transferData?.toAddress, {
            name:
              sellCryptoRequestDetails?.providerDisplayName ||
              formatAddress(transferData?.toAddress),
            sub: formatAddress(transferData?.toAddress),
            initial: sellCryptoRequestDetails?.providerDisplayName || '#',
          })}
          link={
            transferData?.memo
              ? `Memo: ${transferData.memo}`
              : tokenLink(coin) || 'Sell order deposit'
          }
        />
        <DetailsCard>
          <InfoRow label={'Asset'} value={`${coin?.name} (${coin?.symbol})`} />
          <InfoRow label={'Network'} value={coin?.chain_display_name} />
          <InfoRow
            label={'Provider'}
            value={sellCryptoRequestDetails?.providerDisplayName}
          />
        </DetailsCard>
      </>
    );
  };

  const renderExchangeUI = () => (
    <>
      <Journey
        from={{
          coin: selectedFromAsset,
          name: `${amountFrom} ${selectedFromAsset?.symbol || ''}`,
          sub: `${selectedFromAsset?.chain_display_name || ''} · ${getCustomizePublicAddress(
            selectedFromAsset?.address,
          )}`,
          meta: fiatValue,
        }}
        to={{
          coin: selectedToAsset,
          name: `${amountTo} ${selectedToAsset?.symbol || ''}`,
          sub: `${selectedToAsset?.chain_display_name || ''} · ${
            exchangeToName || getCustomizePublicAddress(exchangeToAddress)
          }`,
          meta: selectedExchangeChain?.providerName
            ? `via ${selectedExchangeChain.providerName}`
            : null,
        }}
        link='You swap'
      />
    </>
  );

  const renderStakingUI = () => {
    const coin = transferData?.currentCoin;
    const validatorLabel =
      transferData?.validatorName ||
      (transferData?.validatorPubKey
        ? getCustomizePublicAddress(transferData.validatorPubKey)
        : null);
    return (
      <>
        <AmountHero
          coin={coin}
          amount={transferData?.amount}
          symbol={coin?.symbol}
          fiat={fiatValue}
          sign={isCreateStaking ? '' : isWithdrawStaking ? '+' : ''}
        />
        <Journey
          from={fromParty(coin)}
          to={{
            name: validatorLabel || coin?.chain_display_name || 'Staking',
            sub:
              transferData?.validatorName && transferData?.validatorPubKey
                ? getCustomizePublicAddress(transferData.validatorPubKey)
                : 'Validator',
            initial: validatorLabel || 'V',
          }}
          link={title
            .replace('Confirm ', '')
            .replace(/^./, c => c.toUpperCase())}
        />
        {!!transferData?.resourceType && (
          <DetailsCard>
            <InfoRow
              label={'Resource type'}
              value={transferData.resourceType}
            />
          </DetailsCard>
        )}
      </>
    );
  };

  const renderVotingUI = () => {
    const displayValidators = Array.isArray(transferData?.displayValidators)
      ? transferData?.displayValidators
      : [];
    return (
      <section className={s.listCard}>
        {displayValidators?.map(item => (
          <ValidatorItem
            item={item}
            hideInput={true}
            key={item.validatorAddress}
            containerStyle={{
              marginLeft: '0px',
              marginRight: '0px',
              width: '100%',
            }}
          />
        ))}
      </section>
    );
  };

  const renderBatchTransactionUI = () => {
    const batchTransactions = Array.isArray(transferData?.transactionsData)
      ? transferData?.transactionsData
      : [];
    return (
      <section className={s.listCard}>
        {batchTransactions?.map((item, index) => (
          <BatchTransactionItem
            key={`batch_transaction_${index}`}
            item={item}
            isSelected={false}
            isSelectionMode={false}
            localCurrency={localCurrency}
          />
        ))}
      </section>
    );
  };

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
        <h1 className={s.title}>{title}</h1>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

      <div className={s.column}>
        {(isLoading || isExchangeLoading) && !isFetchingFeesAgain ? (
          <div className={s.loading}>
            <Loading />
          </div>
        ) : ready ? (
          <>
            {isSendFundScreen
              ? renderSendFundUI()
              : isSellCryptoScreen
                ? renderSellCryptoUI()
                : isExchangeScreen
                  ? renderExchangeUI()
                  : isStakingScreen
                    ? renderStakingUI()
                    : isBatchTransaction
                      ? renderBatchTransactionUI()
                      : renderVotingUI()}

            {showFeeTiers ? (
              <section className={s.fees} aria-label='Network fee'>
                <div className={s.feesHead}>
                  <span className={s.sectionLabel}>Network fee</span>
                  <span className={s.feesSelected}>{selectedFeesLabel}</span>
                </div>
                <div
                  className={s.tiers}
                  style={{'--tier-count': Math.min(feesOptions.length + 1, 4)}}
                  role='radiogroup'
                  aria-label='Network fee'>
                  {feesOptions.map(option => {
                    const type = option?.title?.toLowerCase();
                    if (!type) {
                      return null;
                    }
                    const on = selectedFeesType?.toLowerCase() === type;
                    return (
                      <button
                        key={type}
                        type='button'
                        role='radio'
                        aria-checked={on}
                        className={`${s.tier} ${on ? s.tierOn : ''}`}
                        onClick={() =>
                          advancedFeesSheetProps.onSelectFeesType(
                            type,
                            option.gasPrice,
                          )
                        }>
                        <span className={s.tierLabel}>{option.title}</span>
                        <span className={s.tierCost}>
                          {option.gasPrice} {gasCurrency}
                        </span>
                      </button>
                    );
                  })}
                  <button
                    type='button'
                    role='radio'
                    aria-checked={selectedFeesType === 'custom'}
                    className={`${s.tier} ${s.tierCustom} ${
                      selectedFeesType === 'custom' ? s.tierOn : ''
                    }`}
                    onClick={selectCustomFees}>
                    <SettingsIcon size={17} />
                    <span className={s.tierLabel}>Custom</span>
                  </button>
                </div>
                {selectedFeesType === 'custom' ? (
                  <button
                    type='button'
                    className={s.editFees}
                    onClick={openAdvancedOptions}>
                    Edit custom fee and nonce
                  </button>
                ) : null}
              </section>
            ) : null}

            {isDisabled && (
              <p className={s.alert} role='alert'>
                {`You don't have enough balance for this transaction. You need ${transferData?.transactionFee} ${transferData?.currentCoin?.chain_symbol} to cover the fee.`}
              </p>
            )}
            {isQuoteExpired && (
              <p className={s.alert} role='alert'>
                Quote expired — go back and refresh the quote.
              </p>
            )}
            {!isCustomFeesValid && (
              <p className={s.alert} role='alert'>
                Priority fee cannot be higher than max fee — fix it in the
                custom fee settings.
              </p>
            )}

            <div className={s.summary}>
              <span className={s.summaryCol}>
                <span className={s.sectionLabel}>
                  {isEip1559 ? 'Estimated fee' : 'Fee'}
                </span>
                <span className={s.summaryFee}>
                  {isFetchingFeesAgain ? (
                    <span className={s.refreshing}>Refreshing…</span>
                  ) : (
                    <>
                      {feeAmount || '0'} {feeSymbol}
                      {isEip1559 && transferData?.transactionFee ? (
                        <span className={s.summaryMuted}>
                          {' '}
                          · max {transferData.transactionFee}
                        </span>
                      ) : null}
                    </>
                  )}
                </span>
              </span>
              {showTotal ? (
                <span className={`${s.summaryCol} ${s.summaryEnd}`}>
                  <span className={s.sectionLabel}>
                    {isEip1559 ? 'Max total' : 'Total'}
                  </span>
                  <span className={s.summaryTotal}>{maxTotal}</span>
                </span>
              ) : null}
            </div>

            <GeneralButton
              fullWidth
              className={s.sendButton}
              disabled={isSendDisabled}
              loading={isSubmitting}
              loadingLabel='Sending…'
              onClick={handleSubmitForm}>
              <CheckIcon size={19} />
              {title}
            </GeneralButton>
          </>
        ) : (
          <section className={s.emptyCard}>
            <p className={s.emptyTitle}>Could not prepare this transaction</p>
            <p className={s.emptyText}>
              {customError
                ? customError?.toString()
                : 'Something went wrong in generating transaction fees'}
            </p>
            <GeneralButton variant='secondary' onClick={goBack}>
              Go back
            </GeneralButton>
          </section>
        )}
      </div>

      {showFeeTiers ? (
        <HomeSheet
          visible={isAdvancedOptionsOpen}
          onClose={closeAdvancedOptions}
          title='Custom fee'
          labelId='custom-fee-title'>
          <div className={s.sheetBody}>
            <AdvancedFeesSheet {...advancedFeesSheetProps} />
          </div>
          <GeneralButton
            fullWidth
            disabled={!isCustomFeesValid}
            onClick={closeAdvancedOptions}>
            Apply
          </GeneralButton>
        </HomeSheet>
      ) : null}
      <ModalConfirmTransaction
        hideModal={hideConfirmModal}
        visible={showConfirmModal}
        onSuccess={onSuccess}
      />
      <DuplicateTransactionModal
        visible={showDuplicateModal}
        onClose={closeDuplicateModal}
      />
    </main>
  );
};

export default CommonTransfer;
