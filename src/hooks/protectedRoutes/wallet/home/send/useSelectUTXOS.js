import {useCallback, useEffect, useMemo, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import {setCurrentTransferData} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {refreshCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';

// Logic for the Select UTXOs screen (Bitcoin coin control).
export const useSelectUTXOS = () => {
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

  return {
    goBack: () => router.back(),
    currentCoin,
    isLoading,
    allUTXOs,
    deriveAddressByAddress,
    onSelectAll,
    onSelectChange,
    disableContinue,
    onClickContinue,
  };
};

export default useSelectUTXOS;
