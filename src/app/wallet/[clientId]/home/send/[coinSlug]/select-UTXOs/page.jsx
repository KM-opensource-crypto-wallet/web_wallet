'use client';
import AddressTypeBadge from 'components/AddressTypeBadge';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import s from './SelectUTXOs.module.css';
import Loading from 'src/components/Loading';
import GeneralButton from 'components/Button';
import {CheckIcon, ChevronLeftIcon} from 'components/Home/HomeIcons';
import useSelectUTXOS from 'src/hooks/protectedRoutes/wallet/home/send/useSelectUTXOS';

const SelectUTXOs = () => {
  const {
    goBack,
    currentCoin,
    isLoading,
    allUTXOs,
    deriveAddressByAddress,
    onSelectAll,
    onSelectChange,
    disableContinue,
    onClickContinue,
  } = useSelectUTXOS();

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
        <h1 className={s.title}>Select UTXOs</h1>
        <GeneralButton
          variant='unstyled'
          className={s.selectAll}
          onClick={onSelectAll}>
          Select All
        </GeneralButton>
      </div>
      <div className={s.column}>
        {isLoading ? (
          <div className={s.loading}>
            <Loading />
          </div>
        ) : (
          <>
            <div className={s.list}>
              {allUTXOs.map((item, index) => (
                <section
                  className={s.group}
                  key={`utxos-address-${index?.toString()}`}>
                  {/* Address row: toggles every UTXO under it. */}
                  <label
                    className={`${s.row} ${s.groupRow} ${
                      item.isSelected ? s.rowOn : ''
                    }`}>
                    <input
                      type='checkbox'
                      className={s.nativeCheck}
                      checked={item.isSelected}
                      onChange={() => onSelectChange(item.label)}
                    />
                    <span className={s.tick} aria-hidden='true'>
                      {item.isSelected ? (
                        <CheckIcon size={13} strokeWidth={3} />
                      ) : null}
                    </span>
                    <span className={s.textBold} title={item.label}>
                      {getCustomizePublicAddress(item.label)} (
                      {item.data.reduce((acc, e) => (acc += e.value), 0)})
                    </span>
                    <AddressTypeBadge
                      chain_name={currentCoin?.chain_name}
                      item={deriveAddressByAddress.get(item.label)}
                    />
                  </label>
                  {item.data.map(items => (
                    <label
                      className={`${s.row} ${s.subRow} ${
                        items.isSelected ? s.rowOn : ''
                      }`}
                      key={`sub-utxos-address-${items?.txid?.toString()}`}>
                      <input
                        type='checkbox'
                        className={s.nativeCheck}
                        checked={items.isSelected}
                        onChange={() =>
                          onSelectChange(item.label, items.txid, items.vout)
                        }
                      />
                      <span className={s.tick} aria-hidden='true'>
                        {items.isSelected ? (
                          <CheckIcon size={13} strokeWidth={3} />
                        ) : null}
                      </span>
                      <span className={s.text} title={items.fromAddress}>
                        {getCustomizePublicAddress(items.fromAddress)} (
                        {items.value})
                      </span>
                    </label>
                  ))}
                </section>
              ))}
            </div>
            <div className={s.footer}>
              <GeneralButton
                fullWidth
                disabled={disableContinue}
                onClick={onClickContinue}>
                Continue
              </GeneralButton>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default SelectUTXOs;
