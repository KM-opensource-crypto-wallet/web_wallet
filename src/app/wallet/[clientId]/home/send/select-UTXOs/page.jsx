'use client';
import AddressTypeBadge from 'components/AddressTypeBadge';
import GoBackButton from 'components/GoBackButton';
import {getCustomizePublicAddress} from 'dok-wallet-blockchain-networks/helper';
import {
  clearSelectedUTXOs,
  setCurrentTransferData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {refreshCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {useParams, useRouter} from 'next/navigation';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import s from './SelectUTXOs.module.css';
import Loading from 'src/components/Loading';
import {Checkbox} from '@mui/material';
import PageTitle from 'src/components/PageTitle';

const SelectUTXOs = () => {
  const dispatch = useDispatch();
  const currentCoin = useSelector(selectCurrentCoin);
  const [allUTXOs, setAllUTXOs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const {clientId} = useParams();

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
    router.push(`/wallet/${clientId}/home/send/send-funds`);
  };

  useEffect(() => {
    if (!currentCoin) {
      router.replace(`/wallet/${clientId}/home`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCoin]);

  return (
    <>
      <PageTitle
        title='Select UTXOs'
        extraElement={
          <div className={s.extraElementContainer}>
            <button onClick={onSelectAll}>
              <p className={s.title}>Select All</p>
            </button>
          </div>
        }
      />
      <div className={s.contentContainerStyle}>
        {isLoading ? (
          <Loading />
        ) : (
          <div className={s.container}>
            <div className={s.subContainer}>
              {allUTXOs.map((item, index) => (
                <div
                  className={s.item}
                  key={`utxos-address-${index?.toString()}`}>
                  <div className={s.box}>
                    <Checkbox
                      checked={item.isSelected}
                      onChange={() => onSelectChange(item.label)}
                    />
                    <p className={s.textBold} title={item.label}>
                      {getCustomizePublicAddress(item.label)} (
                      {item.data.reduce((acc, e) => (acc += e.value), 0)})
                    </p>
                    <AddressTypeBadge
                      chain_name={currentCoin?.chain_name}
                      item={deriveAddressByAddress.get(item.label)}
                    />
                  </div>
                  <div className={s.subItem}>
                    {item.data.map(items => (
                      <div
                        className={s.box}
                        key={`sub-utxos-address-${items?.txid?.toString()}`}>
                        <Checkbox
                          checked={items.isSelected}
                          onChange={() =>
                            onSelectChange(item.label, items.txid, items.vout)
                          }
                        />
                        <p className={s.text} title={items.fromAddress}>
                          {getCustomizePublicAddress(items.fromAddress)} (
                          {items.value})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              className={s.button}
              disabled={disableContinue}
              onClick={onClickContinue}
              style={{
                backgroundColor: disableContinue
                  ? 'var(--gray)'
                  : 'var(--background)',
              }}>
              <p className={s.buttonTitle}>Continue</p>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default SelectUTXOs;
