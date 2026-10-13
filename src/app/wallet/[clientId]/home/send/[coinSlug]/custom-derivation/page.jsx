'use client';
import React from 'react';
import s from './CustomDerivation.module.css';
import GeneralButton from 'components/Button';
import CoinIcon from 'components/CoinIcon';
import {ChevronLeftIcon, PlusIcon} from 'components/Home/HomeIcons';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import SelectInputExchange from 'components/SelectInputExchange';
import AddressTypeBadge from 'components/AddressTypeBadge';
import CustomDerivationPopOver from 'components/CustomDerivationPopOver';
import useCustomDerivation from 'src/hooks/protectedRoutes/wallet/home/send/useCustomDerivation';

const CustomDerivation = () => {
  const {
    goBack,
    currentCoin,
    derivationData,
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    onChangeDerivePath,
    isCustom,
    customPathError,
    isAtLimit,
    isButtonDisabled,
    isSubmitting,
    showAdd50,
    isAdding50more,
    onAdd50MoreAddresses,
    allDeriveAddress,
    exportCsv,
  } = useCustomDerivation();

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.back}
          aria-label='Back'
          onClick={goBack}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <div className={s.titleBlock}>
          <h1 className={s.title}>Custom derivation</h1>
          <span className={s.subtitle}>
            {currentCoin?.name} ({currentCoin?.symbol})
          </span>
        </div>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>
      <div className={s.column}>
        <form className={s.card} onSubmit={handleSubmit} noValidate>
          <h2 className={s.cardHeading}>Add an address</h2>
          <div className={s.field}>
            <span className={s.label}>Derivation path</span>
            <div className={s.selectBox}>
              <SelectInputExchange
                listData={derivationData}
                onValueChange={onChangeDerivePath}
                selectedValue={values.selectedDerivationOptions}
                placeholder={'Select derive path'}
              />
            </div>
          </div>

          {isCustom && (
            <div className={s.field}>
              <label htmlFor='customDerivePath' className={s.label}>
                Custom path
              </label>
              <div
                className={`${s.inputBox} ${
                  customPathError ? s.inputBoxError : ''
                }`}>
                <input
                  id='customDerivePath'
                  className={s.input}
                  name='customDerivePath'
                  autoComplete='off'
                  spellCheck={false}
                  onChange={handleChange('customDerivePath')}
                  onBlur={handleBlur('customDerivePath')}
                  value={values.customDerivePath}
                  placeholder="m/44'/60'/0'/0/0"
                />
              </div>
              {customPathError ? (
                <p className={s.error} role='alert'>
                  {errors.customDerivePath}
                </p>
              ) : null}
            </div>
          )}

          {isAtLimit && (
            <p className={s.alert} role='alert'>
              Maximum limit of 100 accounts reached.
            </p>
          )}

          <GeneralButton
            type='submit'
            fullWidth
            disabled={isButtonDisabled}
            loading={isSubmitting}
            loadingLabel='Adding…'>
            Add address
          </GeneralButton>
        </form>

        {showAdd50 && (
          <GeneralButton
            variant='secondary'
            fullWidth
            className={s.add50}
            loading={isAdding50more}
            loadingLabel='Adding addresses…'
            onClick={onAdd50MoreAddresses}>
            <PlusIcon size={18} />
            Add 50 more addresses
          </GeneralButton>
        )}

        <section className={s.accounts} aria-label='All accounts'>
          <div className={s.accountsHeader}>
            <h2 className={s.accountsTitle}>
              All accounts
              <span className={s.count}>{allDeriveAddress.length}</span>
            </h2>
            <GeneralButton
              variant='chip'
              className={s.exportChip}
              disabled={!allDeriveAddress.length}
              onClick={exportCsv}>
              Export CSV
            </GeneralButton>
          </div>

          <ul className={s.accountList}>
            {allDeriveAddress.map((item, index) => {
              const isSelected = item?.address === currentCoin?.address;
              return (
                <li
                  key={`custom-address${index?.toString()}`}
                  className={`${s.account} ${
                    isSelected ? s.accountSelected : ''
                  }`}>
                  <span className={s.accountIcon}>
                    <CoinIcon item={currentCoin} />
                  </span>
                  <div className={s.accountMain}>
                    <div className={s.accountTop}>
                      <span className={s.path}>
                        {item?.derivePath || 'default'}
                      </span>
                      <AddressTypeBadge
                        chain_name={currentCoin?.chain_name}
                        item={item}
                      />
                      {isSelected && (
                        <span className={s.selectedPill}>Selected</span>
                      )}
                    </div>
                    <span className={s.address} title={item?.address}>
                      {getCustomizePublicAddress(item?.address)}
                    </span>
                  </div>
                  <div className={s.menu}>
                    <CustomDerivationPopOver selectedItem={item} />
                  </div>
                </li>
              );
            })}
          </ul>
          {allDeriveAddress.length === 0 && (
            <p className={s.empty}>No addresses yet</p>
          )}
        </section>
      </div>
    </main>
  );
};

export default CustomDerivation;
