'use client';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import AddressTypeBadge from 'components/AddressTypeBadge';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import {
  clearSelectedUTXOs,
  setCurrentTransferData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {refreshCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {useRouter} from 'next/navigation';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import s from './SelectUTXOs.module.css';
import Loading from 'src/components/Loading';
import GeneralButton from 'components/Button';
import {CheckIcon, ChevronLeftIcon} from 'components/Home/HomeIcons';

const SelectUTXOs = () => {
  const dispatch = useDispatch();
  const currentCoin = useSelector(selectCurrentCoin);
  const [allUTXOs, setAllUTXOs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const routes = useAppRoutes();

  const coinId = useMemo(() => {
    return currentCoin?._id + currentCoin?.name + currentCoin?.chain_name;
  }, [currentCoin]);

  // UTXO groups are keyed by bare address; map back to the derive entry so the
  // group header can show the address type.
  const deriveAddressByAddress = useMemo(() => {
    const map = new Map();
    (currentCoin?.deriveAddresses || []).forEach(item => {
      if (item?.address) {
        map.set(item.address, item);
      }
    });
    return map;
  }, [currentCoin?.deriveAddresses]);

  const disableContinue = useMemo(
    () => allUTXOs.every(item => !item.isSelected),
    [allUTXOs],
  );

  useEffect(() => {
    if (!currentCoin?.UTXOs) {
      return;
    }

    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setAllUTXOs(
        currentCoin.UTXOs.map(item => ({
          ...item,
          isSelected: false,
          data: item.data
            .map(tx => ({
              ...tx,
              isSelected: false,
            }))
            .sort((a, b) => a.vout - b.vout),
        })),
      );
    })();
  }, [currentCoin?.UTXOs]);

  useEffect(() => {
    if (currentCoin?.address) {
      dispatch(refreshCurrentCoin({fetchUTXOs: true}))
        .unwrap()
        .then(() => {
          setIsLoading(false);
        })
        .catch(e => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinId, dispatch]);

  const onSelectAll = useCallback(() => {
    setAllUTXOs(prev => {
      const allSelected = prev.every(item => item.isSelected);
      const newValue = !allSelected;
      return prev.map(item => ({
        ...item,
        isSelected: newValue,
        data: item.data.map(tx => ({...tx, isSelected: newValue})),
      }));
    });
  }, [setAllUTXOs]);

  const onSelectChange = (label, txid = null, vout = null) => {
    setAllUTXOs(prev =>
      prev.map(item => {
        if (item.label !== label) {
          return item;
        }
        if (!txid) {
          const toggled = !item.isSelected;
          return {
            ...item,
            isSelected: toggled,
            data: item.data.map(tx => ({...tx, isSelected: toggled})),
          };
        }
        const updatedData = item.data.map(tx =>
          tx.vout === +vout && tx.txid === txid
            ? {...tx, isSelected: !tx.isSelected}
            : tx,
        );
        const isSelected = updatedData.some(tx => tx.isSelected);
        return {
          ...item,
          data: updatedData,
          isSelected,
        };
      }),
    );
  };

  const onClickContinue = () => {
    const selectedUTXOs = allUTXOs.flatMap(item =>
      item.data.filter(tx => tx.isSelected),
    );
    const selectedUTXOsValue = selectedUTXOs.reduce(
      (acc, item) => (acc += item.value),
      0,
    );
    dispatch(setCurrentTransferData({selectedUTXOsValue, selectedUTXOs}));
    router.push(routes.coin.sendFunds());
  };

  useEffect(() => {
    if (!currentCoin) {
      router.replace(routes.wallet.home());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCoin]);

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.back}
          aria-label='Back'
          onClick={() => router.back()}>
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
