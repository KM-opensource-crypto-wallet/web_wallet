import React, {
  useState,
  useEffect,
  useContext,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'react';
// import {
//   button,
//   View,
//   Text,
//   TouchableWithoutFeedback,
//   Keyboard,
//   SafeAreaView,
//   KeyboardAvoidingView,
//   Platform,
// } from "react-native";
// import { TextInput } from "react-native-paper";
import {Formik} from 'formik';
import * as Yup from 'yup';
import {wallet} from 'data/data';
// import myStyles from "./CreateWalletStyles";
// import { useSelector, shallowEqual } from "react-redux";
// import { isIpad, useFloatingHeight } from "service/dimensions";
// import { ThemeContext } from "../../../../../ThemeContext";
// import ThemedIcon from "components/ThemedIcon";
// import { useDispatch } from "redux/utils/useDispatch";
// import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
// import ModalDelete from "components/ModalDelete";
import {
  _currentWalletIndexSelector,
  selectAllWalletName,
  selectAllWallets,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  createWallet,
  deleteWallet,
  refreshCoins,
  updateWalletName,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  selectIsSyncing,
  selectSyncingWalletIndex,
  selectSyncingWalletName,
} from 'dok-wallet-blockchain-networks/redux/coinSync/coinSyncSelectors';
import useCoinScanCooldown from 'src/hooks/useCoinScanCooldown';
// import Spinner from "components/Spinner";

import s from './CreateOrUpdateWallet.module.css';
import {useRouter, useSearchParams} from 'next/navigation';
import allWallets from 'data/tmpAllWallets';
const icons = require(`assets/images/icons`).default;
import ModalDelete from 'components/ModalDelete';
import {CircularProgress} from '@mui/material';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Radar from '@mui/icons-material/Radar';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import {shallowEqual, useDispatch, useSelector} from 'react-redux';
import {
  getChainName,
  getPhrase,
  getPrivateKey,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraSelectors';
import {toast} from 'react-toastify';
import GoBackButton from '../GoBackButton';
import {
  setChainName,
  setPhrase,
  setPrivateKey,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {resetPaymentUrl} from 'dok-wallet-blockchain-networks/redux/settings/settingsSlice';

const CreateOrUpdateWallet = () => {
  // const { theme } = useContext(ThemeContext);
  // const styles = myStyles(theme);
  const formikRef = useRef(null);
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const walletName = searchParams.get('walletName');
  const walletIndex = searchParams.get('walletIndex');
  const phrase = useSelector(getPhrase);
  const privateKey = useSelector(getPrivateKey);
  const chain_name = useSelector(getChainName);
  const router = useRouter();

  const currentWallet = useSelector(selectCurrentWallet);
  const currentWalletIndex = useSelector(_currentWalletIndexSelector);
  const allWalletName = useSelector(selectAllWalletName, shallowEqual);
  const allWallets = useSelector(selectAllWallets);
  const finalAllWallets = useRef(
    allWalletName.filter(subItem => subItem !== walletName),
  );

  const defaultNewWalletName = currentWallet?.walletName; //`Wallet ${allWallets.length}`;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const floatingHeight = useFloatingHeight();

  const [wrong, setWrong] = useState(false);
  const isCurrentWallet = walletName === defaultNewWalletName;

  // The wallet being edited (only reachable while it's visible), as opposed to
  // `currentWallet` which is the globally active wallet.
  const editingWallet = walletIndex != null ? allWallets[walletIndex] : null;

  // Coin scan (1 per 24h per wallet) targets the wallet being edited
  const scanTargetIndex = walletIndex ?? currentWalletIndex;
  const scanWallet = editingWallet ?? currentWallet;
  const {isAvailable: isScanAvailable, remainingLabel: scanRemainingLabel} =
    useCoinScanCooldown(scanWallet?.lastCoinsScanTimestamp);
  const isCoinSyncRunning = useSelector(selectIsSyncing);
  const syncingWalletIndex = useSelector(selectSyncingWalletIndex);
  const syncingWalletName = useSelector(selectSyncingWalletName);
  const isScanningThisWallet =
    isCoinSyncRunning &&
    syncingWalletIndex !== null &&
    Number(syncingWalletIndex) === Number(scanTargetIndex);
  // Only one scan can run at a time - lock the row while another wallet scans
  const isScanningOtherWallet = isCoinSyncRunning && !isScanningThisWallet;
  const isScanRowEnabled =
    isScanningThisWallet || (isScanAvailable && !isScanningOtherWallet);
  const ScanIcon = isScanningOtherWallet
    ? HourglassEmpty
    : isScanAvailable
      ? Radar
      : ScheduleOutlined;

  useEffect(() => {
    if (!walletName) {
      let newWalletName = null;
      if (allWallets.length !== 0) {
        let newWalletIndex = allWallets.length + 1;
        do {
          newWalletName = `Wallet ${newWalletIndex}`;
          newWalletIndex += 1;
        } while (allWalletName.includes(newWalletName) === true);
      }
      setTimeout(() => {
        formikRef.current?.setFieldValue(
          'name',
          newWalletName || 'Main Wallet',
        );
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useLayoutEffect(() => {
  //   if (!isCurrentWallet && walletName) {
  //     navigation.setOptions({
  //       headerRight: () => (
  //         <button
  //           className={{ padding: 10, paddingRight: isIpad ? 50 : 10 }}
  //           onPress={() => {
  //             setShowDeleteModal(true);
  //           }}
  //         >
  //           <MaterialCommunityIcons
  //             name="delete"
  //             color={theme.font}
  //             size={24}
  //           />
  //         </button>
  //       ),
  //     });
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  const validateNewWalletName = value => {
    if (currentWallet?.walletName !== value) {
      const wrong = allWallets.some(({walletName}, index) => {
        if (walletName === value && index !== currentWallet.id) {
          return true;
        }
        return false;
      });
      setWrong(wrong);
    }
  };

  const onPressYes = useCallback(() => {
    setShowDeleteModal(false);
    router.push('/home');
    setTimeout(() => {
      if (walletIndex !== null && walletIndex !== undefined) {
        dispatch(deleteWallet(walletIndex));
      }
    }, 1000);
  }, [dispatch, router, walletIndex]);

  const onPressNo = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const handleSubmit = async values => {
    const toastId = toast.loading(
      walletName ? 'Updating Wallet' : 'Creating Wallet',
      {
        autoClose: false,
      },
    );
    setIsSubmitting(true);
    setTimeout(async () => {
      try {
        if (walletName) {
          dispatch(
            updateWalletName({
              index: walletIndex ?? currentWalletIndex,
              walletName: values.name,
            }),
          );
          router.back();
          setIsSubmitting(false);
          toast.dismiss(toastId);
          toast.success('Wallet updated successfully');
        } else {
          dispatch(resetPaymentUrl());
          await dispatch(
            createWallet({
              walletName: values.name || 'Main Wallet',
              phrase,
              privateKey,
              chain_name,
            }),
          ).unwrap();
          const redirectRoute = searchParams?.get('redirectRoute');
          let searchParamsString = '';
          for (const key of searchParams.keys()) {
            if (key !== 'redirectRoute') {
              searchParamsString += `${key}=${searchParams.get(key)}&`;
            }
          }
          router.replace(
            redirectRoute
              ? `${redirectRoute}${
                  searchParamsString ? '?' + searchParamsString : ''
                }`
              : `/home${searchParamsString ? '?' + searchParamsString : ''}`,
          );
          dispatch(refreshCoins());
          setTimeout(() => {
            dispatch(setPhrase(null));
            dispatch(setPrivateKey(null));
            dispatch(setChainName(null));
          }, 500);
          setIsSubmitting(false);
          toast.dismiss(toastId);
          toast.success('Wallet created successfully');
        }
      } catch (e) {
        setIsSubmitting(false);
        toast.dismiss(toastId);
        toast.error('Something went wrong');
        console.error('error in create wallet', e);
      }
    }, 300);
  };

  // const finalAllWallets = { current: allWallets };

  const validationSchema = Yup.object().shape({
    name: Yup.string()
      .required('* Name cannot be empty')
      .notOneOf(finalAllWallets.current, 'The name of wallet already existed'),
  });

  return (
    <div className={s.safeAreaView}>
      <div className={s.container}>
        {!!walletName && <GoBackButton />}
        <div className={s.formInput}>
          <p className={s.brand}>{walletName || ''}</p>
          <Formik
            enableReinitialize={true}
            initialValues={{
              name: walletName || '',
            }}
            innerRef={formikRef}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}>
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
            }) => (
              <div>
                <div>
                  <div className={s.inputWrtapper}>
                    <input
                      className={s.input}
                      label='Name'
                      style={{
                        borderColor: errors.name ? 'red' : 'var(--gray)',
                      }}
                      name='name'
                      autoFocus={!walletName}
                      onChange={handleChange('name')}
                      onBlur={() => {
                        validateNewWalletName(values.name);
                        handleBlur('currentPassword');
                      }}
                      value={values.name}
                    />
                    {!isCurrentWallet && walletName ? (
                      <span
                        className={s.deleteIcon}
                        onClick={() => setShowDeleteModal(true)}>
                        {icons.delete}
                      </span>
                    ) : null}
                  </div>
                  {errors.name && (
                    <p className={s.textConfirm}>{errors.name}</p>
                  )}

                  {wrong === true && (
                    <p className={s.textWarning}>
                      * Choose a different wallet name
                    </p>
                  )}
                  {walletName ? (
                    <div>
                      <p className={s.listTitle}>Secret phrase backups</p>
                      {wallet.map((item, index) => (
                        <button
                          className={s.item}
                          key={index}
                          onClick={() => {
                            if (item.title === 'Manual Backup') {
                              router.push('/verify/verify-create');
                              // navigation.push("VerifyLogin");
                            }
                          }}>
                          <div className={s.itemIcon}>{item.icon}</div>

                          <div className={s.itemSection}>
                            <p className={s.itemName}>{item.title}</p>
                            <p
                              className={s.itemText}
                              style={{
                                color: item.body === 'Active' ? 'green' : 'red',
                              }}>
                              {item.body}
                            </p>
                          </div>
                        </button>
                      ))}
                      <div className={s.infoContainer}>
                        <div className={s.infoIcon}>
                          {icons.exclamationcircle}
                        </div>
                        <p className={s.info}>
                          We highly recommend completing manual backup options
                          to help prevent the loss your crypto.
                        </p>
                      </div>

                      <button
                        type='button'
                        className={s.item}
                        style={{marginTop: 20}}
                        onClick={() =>
                          router.push(
                            `/wallets/hide-wallet?walletIndex=${walletIndex}`,
                          )
                        }>
                        <div className={s.itemIcon}>
                          <VisibilityOffOutlined
                            style={{color: 'var(--font)'}}
                          />
                        </div>
                        <div className={s.itemSection}>
                          <p className={s.itemName}>Hide Wallet</p>
                          <p
                            className={s.itemText}
                            style={{color: 'var(--gray)'}}>
                            {editingWallet?.hideSettings
                              ? 'Hidden'
                              : 'Not hidden'}
                          </p>
                        </div>
                        <div className={s.rowSpacer} />
                        <ChevronRight style={{color: 'var(--font)'}} />
                      </button>

                      <button
                        type='button'
                        className={s.item}
                        style={{opacity: isScanRowEnabled ? 1 : 0.5}}
                        disabled={!isScanRowEnabled}
                        onClick={() =>
                          router.push(
                            `/home/coin-sync?walletIndex=${Number(
                              scanTargetIndex,
                            )}`,
                          )
                        }>
                        <div
                          className={`${s.scanIconBubble} ${
                            !isScanRowEnabled ? s.scanIconBubbleDisabled : ''
                          }`}>
                          {isScanningThisWallet ? (
                            <CircularProgress
                              size={20}
                              sx={{color: 'var(--background)'}}
                            />
                          ) : (
                            <ScanIcon
                              style={{
                                color: isScanRowEnabled
                                  ? 'var(--background)'
                                  : 'var(--gray)',
                              }}
                            />
                          )}
                        </div>
                        <div className={s.itemSection}>
                          <p className={s.itemName}>Scan Coins</p>
                          <p
                            className={s.itemText}
                            style={{color: 'var(--gray)'}}>
                            {isScanningThisWallet
                              ? 'Scanning in progress — tap to view'
                              : isScanningOtherWallet
                                ? syncingWalletName
                                  ? `Scanning "${syncingWalletName}"…`
                                  : 'Another wallet is being scanned…'
                                : isScanAvailable
                                  ? 'Discover assets across 200+ coins'
                                  : `Available in ${scanRemainingLabel}`}
                          </p>
                        </div>
                        <div className={s.rowSpacer} />
                        {isScanRowEnabled && (
                          <ChevronRight style={{color: 'var(--font)'}} />
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  disabled={wrong || isSubmitting}
                  className={s.button}
                  style={{opacity: wrong || isSubmitting ? 0.5 : 1}}
                  onClick={handleSubmit}>
                  <p className={s.buttonTitle}>
                    {walletName ? 'Update Wallet' : 'Create Wallet'}
                  </p>
                </button>
              </div>
            )}
          </Formik>
        </div>
        <ModalDelete
          walletName={walletName}
          onPressYes={onPressYes}
          onPressNo={onPressNo}
          visible={showDeleteModal}
        />
        {/* {isLoading && <Spinner />} */}
      </div>
    </div>
  );
};

export default CreateOrUpdateWallet;
