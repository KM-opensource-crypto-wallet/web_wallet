'use client';
import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {currencySymbol} from 'data/currency';
import CryptoList from 'components/CryptoList';
import classNames from './Home.module.css';

const icons = require(`assets/images/icons`).default;
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import WalletConnectStatus from 'components/WalletConnectStatus';
import WalletConnectRequestModal from 'components/WalletConnectRequestModal';
import WalletConnectTransactionModal from 'components/WalletConnectTransactionModal';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import SortMenu from 'components/SortMenu';
import {selectCurrentWalletSortOption} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {sortCurrentWalletCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';

// import myclassNames from './HomeScreenclassNames';
// import {ModalQR} from 'components/ModalQR';
// import {shallowEqual, useSelector} from 'react-redux';
// import isJson from 'dok-wallet-blockchain-networks/service/isJson';
// import isValidHttpUrl from 'dok-wallet-blockchain-networks/service/isValidHttpUrl';
// import {ErrorBoundary} from 'react-error-boundary';
// import {ThemeConp} from '../../../../../ThemeConp';
// import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {
  countTotalAssets,
  selectCurrentWallet,
  selectIsBackedUp,
  selectUserCoins,
  isImportWalletWithPrivateKey,
  getEthereumCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  refreshCoins,
  removeAllWalletConnectSession,
  setCurrentCoin,
  syncCoinsWithServer,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  getLocalCurrency,
  isChatOptions,
} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {toast} from 'react-toastify';
import {
  setWalletConnectRequestModal,
  setWalletConnectTransactionModal,
} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSlice';
// import {foundCoinInCurrentWallet} from 'dok-wallet-blockchain-networks/service/redux.service';
// import {VerifyInfoModal} from 'components/VerifyInfo';
import {
  getNewsMessage,
  isAskedBackedUpModal,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySelectors';
// import {setIsAskedBackupModal} from 'dok-wallet-blockchain-networks/redux/currency/currencySlice';
// import WalletConnectRequestModal from 'components/WalletConnectRequestModal';
import {
  selectRequestedModalVisible,
  selectTransactionModalVisible,
} from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSelectors';
import {selectAllNewCoins} from 'dok-wallet-blockchain-networks/redux/currency/currencySelectors';
import {
  setIsAskedBackupModal,
  setNewCoins,
  setNewsMessage,
  setNewsModalVisible,
} from 'dok-wallet-blockchain-networks/redux/currency/currencySlice';
import IconButton from '@mui/material/IconButton';
import Close from '@mui/icons-material/Close';
import {VerifyInfoModal} from 'components/VerifyInfo';
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import BatchTransactionBanner from 'components/BatchTransactionBanner';
// import {
//   setWalletConnectRequestModal,
//   setWalletConnectTransactionModal,
// } from 'dok-wallet-blockchain-networks/redux/walletConnect/walletConnectSlice';
// import {subscribeWalletConnect} from 'dok-wallet-blockchain-networks/service/walletconnect';
// import WalletConnectStatus from 'components/WalletConnectStatus';
// import WalletConnectTransactionModal from 'components/WalletConnectTransactionModal';
// import {triggerHapticFeedbackHeavy} from 'helper/hapticFeedback';
// import {MainNavigation} from 'helper/navigation';

const COIN_SORT_OPTIONS = [
  {label: 'Default', value: 'default', showDivider: true},
  {label: 'Value: High to Low', value: 'value_desc'},
  {label: 'Value: Low to High', value: 'value_asc'},
  {label: 'Balance: High to Low', value: 'balance_desc'},
  {label: 'Balance: Low to High', value: 'balance_asc', showDivider: true},
  {label: 'Name: A to Z', value: 'name_asc'},
  {label: 'Name: Z to A', value: 'name_desc'},
  {label: 'Symbol: A to Z', value: 'symbol_asc'},
  {label: 'Symbol: Z to A', value: 'symbol_desc'},
];

export default function Home() {
  const searchParams = useSearchParams();
  const walletConnect = searchParams.get('connect');
  const [number, setNumber] = useState(1);
  const [list, setList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const filterButtonRef = useRef(null);

  // const { theme } = useConp(ThemeConp);
  // const classNames = myclassNames(theme);
  const dispatch = useDispatch();

  // const [modalVisible, setmodalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  // const [number, setNumber] = useState(1);
  const ethereumCoin = useSelector(getEthereumCoin, shallowEqual);
  const userCoins = useSelector(selectUserCoins, shallowEqual);
  const localCurrency = useSelector(getLocalCurrency);
  const totalAssets = useSelector(countTotalAssets);
  const allNewCoins = useSelector(selectAllNewCoins);
  const isBackup = useSelector(selectIsBackedUp);
  const isChatOptionsEnabled = useSelector(isChatOptions);
  const currentWallet = useSelector(selectCurrentWallet);
  const isAskedBackup = useSelector(isAskedBackedUpModal);
  const isImportWithPrivateKey = useSelector(isImportWalletWithPrivateKey);
  const newsMessage = useSelector(getNewsMessage);
  const coinsSortOption = useSelector(selectCurrentWalletSortOption);

  const handleSortApply = useCallback(
    newSortOption => {
      dispatch(sortCurrentWalletCoins({sortOption: newSortOption}));
    },
    [dispatch],
  );

  // const showModal = route.params?.showModal;
  // const qrAddress = route.params?.qrAddress;
  // const qrScheme = route.params?.qrScheme;
  // const qrAmount = route.params?.qrAmount;
  // const newDateToString = route.params?.newDateToString;

  const coinsNames = useMemo(() => {
    const tempNewCoins = Array.isArray(allNewCoins) ? allNewCoins : [];
    return tempNewCoins.map(item => item.name).join(', ');
  }, [allNewCoins]);

  // useEffect(() => {
  // Update any contract address for testnet
  // dispatch(
  //   updateContractAddress({
  //     chain_name: 'ton',
  //     symbol: 'USDT',
  //     contractAddress: 'kQD5l75tbhYoCcYMAPzlD1GRTAIdJZ9y-fgI-5xTnEeVIitl',
  //   }),
  // );
  // }, []);

  useEffect(() => {
    if (!isBackup && !isAskedBackup[currentWallet?.walletName]) {
      setTimeout(() => setBackupModalVisible(true), 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setList(userCoins);
  }, [userCoins]);

  // useEffect(() => {}, [newItem, dispatch]);

  // useEffect(() => {
  //   setmodalVisible(showModal || false);
  // }, [newDateToString, showModal]);

  // useEffect(() => {
  //   if (qrAddress && qrScheme) {
  //     const foundCoin = foundCoinInCurrentWallet(qrScheme);
  //     if (foundCoin !== null) {
  //       dispatch(setCurrentCoin(foundCoin?._id));
  //       setTimeout(() => {
  //         navigation.navigate("SendFunds", { qrAddress, qrAmount });
  //       }, 500);
  //     }
  //   }
  // }, [newDateToString, qrAddress, qrScheme, qrAmount]);
  //////////////////////////////////////

  // const handleNavigateManage = () => {
  //   router.push("/manage-coins");
  // };

  const onPressClose = useCallback(() => {
    dispatch(setNewCoins([]));
  }, [dispatch]);

  const onPressNewsClose = useCallback(() => {
    dispatch(setNewsMessage(''));
  }, [dispatch]);

  const onPressSync = useCallback(() => {
    dispatch(setNewCoins([]));
    dispatch(syncCoinsWithServer());
  }, [dispatch]);

  const handleSearch = event => {
    let query = event.target.value;
    setSearchQuery(query);
    if (query) {
      const newList = userCoins?.filter(item => {
        return (
          item?.name?.toLowerCase()?.includes(query?.toLowerCase()) ||
          item?.symbol?.toUpperCase()?.includes(query?.toUpperCase())
        );
      });
      setList(newList);
    } else {
      setList(userCoins);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setList(userCoins);
  };

  return (
    <>
      {/* <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div>
            <p>Something went wrong in HomeScreen</p>
          </div>
        )}
      > */}
      <main className={classNames.container}>
        <div>
          <BatchTransactionBanner />
          {!!newsMessage && (
            <div className={classNames.syncView}>
              <div className={classNames.syncTitle}>{`Important News!`}</div>
              <button
                className={classNames.syncButton}
                onClick={() => {
                  dispatch(setNewsModalVisible(true));
                }}>
                <div className={classNames.syncButtonTitle}>View</div>
              </button>
              <IconButton
                aria-label='closeSyncDiv'
                onClick={onPressNewsClose}
                edge='end'
                sx={{
                  '&  .MuiSvgIcon-root': {
                    color: 'var(--font)',
                  },
                }}>
                <Close />
              </IconButton>
            </div>
          )}
          {!!coinsNames && !isImportWithPrivateKey && (
            <div className={classNames.syncView}>
              <div className={classNames.syncTitle}>
                {`New ${
                  allNewCoins?.length === 1
                    ? 'cryptocurrency'
                    : 'cryptocurrencies'
                }, such as ${coinsNames} ${
                  allNewCoins?.length === 1 ? 'is' : 'are'
                } now accessible.`}
              </div>
              <button className={classNames.syncButton} onClick={onPressSync}>
                <div className={classNames.syncButtonTitle}>Sync</div>
              </button>
              <IconButton
                aria-label='closeSyncDiv'
                onClick={onPressClose}
                edge='end'
                sx={{
                  '&  .MuiSvgIcon-root': {
                    color: 'var(--font)',
                  },
                }}>
                <Close />
              </IconButton>
            </div>
          )}
          <TextField
            placeholder='Search'
            variant='outlined'
            id='search-bar'
            fullWidth
            value={searchQuery}
            onChange={handleSearch}
            sx={{
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
                {
                  borderColor: 'var(--gray)',
                },
              '& .MuiOutlinedInput-root': {
                border: '1px solid var(--gray)',
                borderRadius: '10px',
                marginBottom: '10px',
                fontSize: '18px',
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <IconButton type='submit' aria-label='search'>
                    <SearchIcon
                      sx={{
                        color: 'gray',
                        marginRight: '10px',
                      }}
                    />
                  </IconButton>
                ),
                endAdornment: searchQuery && (
                  <IconButton
                    onClick={clearSearch}
                    size='small'
                    sx={{
                      color: 'gray',
                    }}>
                    <ClearIcon />
                  </IconButton>
                ),
              },
            }}
          />
          <div className={classNames.header}>
            <p className={classNames.headerTitle}>Total Assets</p>
            <div className={classNames.headerRight}>
              <p className={classNames.headerNumber}>
                {currencySymbol[localCurrency] + totalAssets}
              </p>
              <button
                ref={filterButtonRef}
                className={classNames.filterButton}
                onClick={() => setSortMenuVisible(prev => !prev)}>
                {icons.filter}
              </button>
            </div>
          </div>
          <div className={classNames.sortMenuWrapper}>
            <SortMenu
              visible={sortMenuVisible}
              onClose={() => setSortMenuVisible(false)}
              onSelect={handleSortApply}
              currentSort={coinsSortOption}
              anchorRef={filterButtonRef}
              sortOptions={COIN_SORT_OPTIONS}
              title='Sort Coins'
            />
          </div>
          <CryptoList number={number} list={list} />
        </div>
        <WalletConnectStatus />
        <div className={classNames.btnBox}>
          <Link href='/manage-coins' className={classNames.btn}>
            {icons.addCircle}
            <p className={classNames.btnText}>More Coins</p>
          </Link>
        </div>
        {!!ethereumCoin?.address && isChatOptionsEnabled && (
          <Link
            href='/chats'
            className={classNames.chatBtnContainer}
            aria-label='Open chat'>
            {icons.chatIcon}
            <p className={classNames.btnText}>Chats</p>
          </Link>
        )}
      </main>
      {/* <ModalQR
              visible={modalVisible}
              hideModal={setmodalVisible}
              data={
                route?.params?.data
                  ? isJson(route?.params?.data)
                    ? JSON.parse(route?.params?.data).address
                    : isValidHttpUrl(route?.params?.data)
                    ? ""
                    : route?.params?.data
                  : ""
              }
              qrScheme={qrScheme}
            /> */}
      {/* </ErrorBoundary> */}
      <VerifyInfoModal
        visible={backupModalVisible}
        onClose={() => {
          setBackupModalVisible(false);
          dispatch(setIsAskedBackupModal(currentWallet?.walletName));
        }}
      />
    </>
  );
}
