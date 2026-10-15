import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useDispatch} from 'react-redux';
import BigNumber from 'bignumber.js';
import {useAppRoutes} from 'src/hooks/useAppRoutes';
import {getValidationSchemaForCreateStaking} from 'utils/validationSchema';
import {
  calculateEstimateFee,
  setCurrentTransferData,
  updateCurrentTransferData,
} from 'dok-wallet-blockchain-networks/redux/currentTransfer/currentTransferSlice';
import {refreshCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {
  isEVMChain,
  isHaveResourceTypeInCreateStakingScreen,
  isShowUnstakingButton,
  isShowVoteButton,
  isSupportEpochTime,
  isValidatorSupportCreateStakingScreen,
  multiplyBNWithFixed,
  resourcesData,
  validateBigNumberStr,
  validateNumber,
  validateNumberInInput,
} from 'dok-wallet-blockchain-networks/helper';
import {
  fetchValidatorByChain,
  fetchStakingAllowance,
  executeApprove,
  onAddVotes,
  onChangeVotes,
  onMinusVotes,
  setSelectedVotes,
} from 'dok-wallet-blockchain-networks/redux/staking/stakingSlice';
import {setRouteStateData} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {setExchangeSuccess} from 'dok-wallet-blockchain-networks/redux/exchange/exchangeSlice';
import ValidatorOptionItem from 'components/ValidatorOptionItem';
import useWallet from 'src/hooks/wallet/useWallet';
import {STAKING_DISABLED_INPUT_CHAINS} from 'src/data/constants';

// Label shown in a SelectInput for the option whose value is `value`.
const findLabel = (list, value) =>
  list?.find(item => item?.value === value)?.label || value;

const isDisableTextInput = chain_name =>
  STAKING_DISABLED_INPUT_CHAINS.includes(chain_name);

// Shared logic for the staking screens. `screen` is 'create' (Create Staking),
// 'list' (Staking List), 'withdraw' (Withdraw Staking) or 'vote' (Vote
// Staking); it decides which data each page fetches on mount.
export const useStaking = screen => {
  const router = useRouter();
  const routes = useAppRoutes();
  const dispatch = useDispatch();

  const {
    currentCoin,
    localCurrency,
    isStakingLoading,
    allowanceLoading,
    validators,
    routeStateData: routeData,
    selectedVotes,
    selectedVotesTotal: selectedTotal,
  } = useWallet();

  const [isListLoading, setIsListLoading] = useState(true);
  const [maxAmount, setMaxAmount] = useState('0.00000');
  const [allowanceModalVisible, setAllowanceModalVisible] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [pendingStakingProviderName, setPendingStakingProviderName] =
    useState(null);
  const [pendingAmount, setPendingAmount] = useState(null);
  const pendingFormValuesRef = useRef(null);
  const formikRef = useRef(null);
  const defaultValidatorSetRef = useRef(false);

  const isEVMStaking = useMemo(
    () =>
      isEVMChain(currentCoin?.chain_name) &&
      !!currentCoin?.contractAddress &&
      !['tron', 'solana'].includes(currentCoin?.chain_name),
    [currentCoin?.chain_name, currentCoin?.contractAddress],
  );

  const availableAmount = useMemo(() => {
    const amount = currentCoin?.totalAmount || '0';
    const minBalance = currentCoin?.minimumBalance || '0';
    return new BigNumber(amount).minus(new BigNumber(minBalance)).toString();
  }, [currentCoin]);

  const availableAmountCurrency = useMemo(() => {
    return multiplyBNWithFixed(availableAmount, currentCoin?.currencyRate, 2);
  }, [availableAmount, currentCoin?.currencyRate]);

  const validatorList = useMemo(() => {
    return validators.map(item => ({
      label: item?.name,
      value: item?.validatorAddress || item?.name,
      options: item,
      option: <ValidatorOptionItem item={item} currentCoin={currentCoin} />,
    }));
  }, [validators, currentCoin]);

  const isValidatorSupport = useMemo(() => {
    return isValidatorSupportCreateStakingScreen(currentCoin?.chain_name);
  }, [currentCoin?.chain_name]);

  const isResourceSupport = useMemo(() => {
    return isHaveResourceTypeInCreateStakingScreen(currentCoin?.chain_name);
  }, [currentCoin?.chain_name]);

  const resourceData = useMemo(() => {
    return isResourceSupport ? resourcesData[currentCoin?.chain_name] : null;
  }, [isResourceSupport, currentCoin?.chain_name]);

  useEffect(() => {
    if (validatorList?.[0] && !defaultValidatorSetRef.current) {
      defaultValidatorSetRef.current = true;
      formikRef?.current?.setFieldValue('validatorPubKey', validatorList?.[0]);
    }
  }, [validatorList]);

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (new BigNumber(availableAmount).gt(new BigNumber(0))) {
        setMaxAmount(availableAmount);
      }
    })();
  }, [availableAmount]);

  useEffect(() => {
    if (screen === 'create' && isValidatorSupport) {
      dispatch(fetchValidatorByChain({chain_name: currentCoin?.chain_name}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToTransfer = useCallback(
    (values, allowanceType) => {
      dispatch(
        setCurrentTransferData({
          validatorPubKey: isValidatorSupport
            ? values?.validatorPubKey?.value
            : null,
          validatorName: isValidatorSupport
            ? values?.validatorPubKey?.label
            : null,
          stakingProviderName: values?.validatorPubKey?.label,
          allowanceType: allowanceType || 'manual',
          currentCoin,
          amount: validateBigNumberStr(values?.amount),
          isSendFunds: false,
          resourceType: isResourceSupport ? values?.resourceType?.value : null,
        }),
      );
      dispatch(
        calculateEstimateFee({
          isFetchNonce: true,
          fromAddress: currentCoin?.address,
          amount: validateBigNumberStr(values?.amount),
          validatorPubKey: isValidatorSupport
            ? values?.validatorPubKey?.value
            : null,
          balance: availableAmount,
          isCreateStaking: true,
          resourceType: isResourceSupport ? values?.resourceType?.value : null,
          stakingProviderName: values?.validatorPubKey?.label,
        }),
      );
      dispatch(setExchangeSuccess(false));

      dispatch(
        setRouteStateData({
          transfer: {
            fromScreen: 'Staking',
            isCreateStaking: true,
          },
        }),
      );
      router.push(routes.coin.confirmStaking());
    },
    [
      dispatch,
      isValidatorSupport,
      isResourceSupport,
      currentCoin,
      availableAmount,
      router,
      routes,
    ],
  );

  const handleSubmitForm = useCallback(
    async values => {
      if (isEVMStaking) {
        pendingFormValuesRef.current = values;
        setPendingStakingProviderName(values?.validatorPubKey?.label);
        setPendingAmount(values?.amount);
        try {
          const result = await dispatch(
            fetchStakingAllowance({
              stakingProviderName: values?.validatorPubKey?.label,
              amount: values?.amount,
            }),
          ).unwrap();
          if (result?.isApproved) {
            pendingFormValuesRef.current = null;
            navigateToTransfer(values, 'manual');
          } else {
            setAllowanceModalVisible(true);
          }
        } catch (e) {
          console.warn('[CreateStaking] allowance fetch failed:', e?.message);
        }
        return;
      }
      navigateToTransfer(values);
    },
    [dispatch, isEVMStaking, navigateToTransfer],
  );

  const onAllowanceContinue = useCallback(
    async ({
      isFetchNonce,
      type: allowanceType,
      gasFee,
      maxPriorityFeePerGas,
      stakingProviderName,
      amount,
      nonce,
      feesType,
      estimateGas,
      customGasPrice,
    }) => {
      if (!pendingFormValuesRef.current) {
        return;
      }
      const formValues = pendingFormValuesRef.current;
      setApproveLoading(true);
      let tx_hash;
      try {
        const result = await dispatch(
          executeApprove({
            isFetchNonce,
            allowanceType,
            gasFee,
            maxPriorityFeePerGas,
            stakingProviderName:
              stakingProviderName || formValues?.validatorPubKey?.label,
            amount,
            nonce,
            feesType,
            estimateGas,
            customGasPrice,
          }),
        ).unwrap();
        tx_hash = result?.tx_hash;
      } catch (e) {
        setApproveLoading(false);
        setAllowanceModalVisible(false);
        console.warn('[CreateStaking] allowance action failed:', e?.message);
        return;
      }
      setApproveLoading(false);
      setAllowanceModalVisible(false);
      if (!tx_hash) {
        return;
      }
      pendingFormValuesRef.current = null;
      navigateToTransfer(formValues, allowanceType);
    },
    [dispatch, navigateToTransfer],
  );

  const closeAllowanceModal = useCallback(() => {
    setAllowanceModalVisible(false);
    pendingFormValuesRef.current = null;
  }, []);

  // Form field handlers. Formik's setFieldValue is only available inside the
  // render prop, so the component passes it in.
  const setMax = setFieldValue => {
    setFieldValue('currencyAmount', availableAmountCurrency);
    setFieldValue('amount', maxAmount + '');
  };

  const onAmountChange = (event, setFieldValue) => {
    const tempValues = validateNumberInInput(
      event.target.value,
      currentCoin?.decimal,
    );
    const tempAmount = multiplyBNWithFixed(
      tempValues,
      currentCoin?.currencyRate,
      2,
    );
    setFieldValue('currencyAmount', tempAmount);
    setFieldValue('amount', tempValues);
  };

  const onCurrencyAmountChange = (event, setFieldValue) => {
    const tempValues = validateNumberInInput(event.target.value, 2);
    const tempAmount = new BigNumber(tempValues)
      .dividedBy(new BigNumber(currentCoin?.currencyRate))
      .toFixed(Number(currentCoin?.decimal));
    setFieldValue('currencyAmount', tempValues);
    setFieldValue('amount', tempAmount);
  };

  const onValidatorChange = (value, setFieldValue) => {
    const selected = validatorList?.find(item => item?.value === value);
    setFieldValue('validatorPubKey', selected);
  };

  const onResourceTypeChange = (value, setFieldValue) => {
    const selected = resourceData?.find(item => item?.value === value);
    setFieldValue('resourceType', selected);
  };

  const initialValues = {
    amount: '',
    currencyAmount: '',
    validatorPubKey: null,
    resourceType: isResourceSupport ? resourceData[1] : null,
  };

  const validationSchema = getValidationSchemaForCreateStaking(
    currentCoin?.chain_name,
    availableAmount,
  );

  // ---- Staking List ----

  const staking = Array.isArray(currentCoin?.staking)
    ? currentCoin?.staking
    : [];
  const stakingInfo = useMemo(() => {
    return Array.isArray(currentCoin?.stakingInfo)
      ? currentCoin?.stakingInfo
      : [];
  }, [currentCoin?.stakingInfo]);

  const unstakingDisableText = useMemo(() => {
    return stakingInfo.find(item => item.label === 'disabled_unstaking')?.value;
  }, [stakingInfo]);

  const isShowUnstaking = isShowUnstakingButton(currentCoin?.chain_name);
  const isEvmChain = isEVMChain(currentCoin?.chain_name);
  const isShowVote = isShowVoteButton(currentCoin?.chain_name);

  const estimateEpochTimestamp = useMemo(() => {
    const isEpochTime = isSupportEpochTime(currentCoin?.chain_name);
    const tempStakingInfo = Array.isArray(currentCoin?.stakingInfo)
      ? currentCoin?.stakingInfo
      : [];
    if (isEpochTime) {
      return tempStakingInfo?.find(item => item?.label === 'Epoch ends in')
        ?.value;
    }
    return null;
  }, [currentCoin?.chain_name, currentCoin?.stakingInfo]);

  useEffect(() => {
    if (screen === 'list' && currentCoin?.address) {
      dispatch(refreshCurrentCoin({isFetchStaking: true}))
        .unwrap()
        .then(() => {
          setIsListLoading(false);
        })
        .catch(() => {
          setIsListLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPressBoxItem = useCallback(
    (buttonTitle, buttonValue) => {
      const fiatAmount = multiplyBNWithFixed(
        buttonValue,
        currentCoin?.currencyRate,
        2,
      );
      const payload = {
        withdrawStaking: {
          selectedStake: {
            amount: buttonValue,
            fiatAmount,
          },
          ...(buttonTitle === 'Withdraw'
            ? {isWithdrawStaking: true}
            : {isStakingRewards: true}),
          hideResource: true,
        },
      };
      dispatch(setRouteStateData(payload));
      router.push(routes.coin.withdrawStaking());
    },
    [currentCoin?.currencyRate, dispatch, router, routes],
  );

  const handleClaimReward = useCallback(
    (rewardAmount, item) => {
      const fiatAmount = multiplyBNWithFixed(
        rewardAmount,
        currentCoin?.currencyRate,
        2,
      );
      const payload = {
        withdrawStaking: {
          selectedStake: {
            validatorInfo: item?.validatorInfo,
            validator_address: item?.validator_address,
            staking_address: item?.staking_address,
            amount: rewardAmount,
            fiatAmount,
          },
          isStakingRewards: true,
          hideResource: true,
        },
      };
      dispatch(setRouteStateData(payload));
      router.push(routes.coin.withdrawStaking());
    },
    [currentCoin?.currencyRate, dispatch, router, routes],
  );

  const goToValidators = () => {
    dispatch(setSelectedVotes(null));
    router.push(routes.coin.voteStaking());
  };

  const onUnstake = () => {
    const payload = {
      withdrawStaking: {
        isDeactivateStaking: true,
      },
    };
    dispatch(setRouteStateData(payload));
    router.push(routes.coin.withdrawStaking());
  };

  // ---- Withdraw Staking ----

  const currentRouteData = routeData?.withdrawStaking;
  const selectedStake = currentRouteData?.selectedStake;
  const isWithdrawStaking = currentRouteData?.isWithdrawStaking;
  const isDeactivateStaking = currentRouteData?.isDeactivateStaking;
  const isStakingRewards = currentRouteData?.isStakingRewards;
  const hideResource = currentRouteData?.hideResource;

  // Unstaking from an EVM staking provider (different from isEVMStaking,
  // which is about creating a stake on an EVM token).
  const isEVMUnstaking =
    isDeactivateStaking && isEVMChain(currentCoin?.chain_name);

  const coinStaking = currentCoin?.staking;
  const currencyRate = currentCoin?.currencyRate;
  const stakingProviderList = useMemo(() => {
    if (!isEVMUnstaking) {
      return [];
    }
    const stakingItems = Array.isArray(coinStaking) ? coinStaking : [];
    return stakingItems.map(item => ({
      label: item?.validatorInfo?.name,
      value: item?.validatorInfo?.name,
      stakedAmount: item?.stakedAmount,
      fiatAmount: multiplyBNWithFixed(item?.stakedAmount, currencyRate, 2),
    }));
  }, [isEVMUnstaking, coinStaking, currencyRate]);

  const [selectedProvider] = useState(
    stakingProviderList.find(
      p =>
        p.value === selectedStake?.providerName ||
        p.value === selectedStake?.validatorInfo?.name,
    ) ||
      stakingProviderList[0] ||
      null,
  );

  const [isMaxCheckbox, setIsMaxCheckbox] = useState(true);

  const [withdrawState, setWithdrawState] = useState({
    resourceType:
      isResourceSupport && isDeactivateStaking ? resourceData?.[1] : null,
    amount: selectedStake?.stakedAmount || selectedStake?.amount || '0',
    currencyAmount: selectedStake?.fiatAmount || '0',
    errors: {},
  });

  const withdrawAvailableAmount = useMemo(() => {
    if (isEVMUnstaking) {
      return selectedProvider?.stakedAmount || '0';
    }
    return selectedStake?.amount?.toString()
      ? selectedStake?.amount?.toString()
      : withdrawState?.resourceType?.value === 'ENERGY'
        ? currentCoin?.energyBalance
        : currentCoin?.bandwidthBalance;
  }, [
    isEVMUnstaking,
    selectedProvider?.stakedAmount,
    currentCoin?.bandwidthBalance,
    currentCoin?.energyBalance,
    selectedStake?.amount,
    withdrawState.resourceType?.value,
  ]);

  const withdrawAvailableAmountCurrency = useMemo(() => {
    if (selectedStake?.fiatAmount?.toString()) {
      return selectedStake?.fiatAmount?.toString();
    } else {
      const energyBalanceBN = new BigNumber(currentCoin?.energyBalance || 0);
      const bandwidthBalanceBN = new BigNumber(
        currentCoin?.bandwidthBalance || 0,
      );
      const currencyRateBN = new BigNumber(currentCoin?.currencyRate || 0);
      return currencyRateBN
        .multipliedBy(
          withdrawState.resourceType?.value === 'ENERGY'
            ? energyBalanceBN
            : bandwidthBalanceBN,
        )
        .toFixed(2);
    }
  }, [
    currentCoin?.bandwidthBalance,
    currentCoin?.currencyRate,
    currentCoin?.energyBalance,
    selectedStake?.fiatAmount,
    withdrawState.resourceType?.value,
  ]);

  const disableTextInput =
    isDisableTextInput(currentCoin?.chain_name) ||
    !isDeactivateStaking ||
    (isEVMUnstaking && isMaxCheckbox);

  const handleMaxCheckboxToggle = value => {
    setIsMaxCheckbox(value);
    if (value) {
      setWithdrawState(prev => ({
        ...prev,
        amount: withdrawAvailableAmount,
        currencyAmount: withdrawAvailableAmountCurrency,
        errors: {},
      }));
    }
  };

  const withdrawTitle = isWithdrawStaking
    ? 'Withdraw Staking'
    : isDeactivateStaking
      ? 'Deactivate Staking'
      : isStakingRewards
        ? 'Claim Staking Rewards'
        : 'Withdraw Staking';

  const checkWithdrawError = (localAmount, localCurrencyAmount) => {
    const error = {};
    const numLocalAmount = validateNumber(localAmount);
    const numLocalCurrencyAmount = validateNumber(localCurrencyAmount);

    if (
      !numLocalAmount ||
      !numLocalCurrencyAmount ||
      numLocalAmount < 0 ||
      numLocalCurrencyAmount < 0
    ) {
      if (!numLocalAmount || numLocalAmount < 0) {
        error.amount = 'Amount is required and must be a positive number';
      }
      if (numLocalCurrencyAmount < 0) {
        error.currencyAmount =
          'Currency Amount is required and must be a positive number';
      }
      return error;
    }
    const amountBN = new BigNumber(localAmount || 0);
    const currencyAmountBN = new BigNumber(localCurrencyAmount || 0);
    const availableAmountBN = new BigNumber(withdrawAvailableAmount || 0);
    const availableCurrencyAmountBN = new BigNumber(localCurrencyAmount || 0);
    if (amountBN.gt(availableAmountBN)) {
      error.amount = 'Amount is greater than available amount';
    }
    if (currencyAmountBN.gt(availableCurrencyAmountBN)) {
      error.currencyAmount = 'Currency Amount is greater than available amount';
    }
    return error;
  };

  const handleWithdrawSubmit = async () => {
    const {amount, currencyAmount, resourceType} = withdrawState;
    const localErrors =
      isEVMUnstaking && isMaxCheckbox
        ? {}
        : checkWithdrawError(amount, currencyAmount);
    if (Object.keys(localErrors).length === 0) {
      const stakingProviderName = isEVMUnstaking
        ? selectedProvider?.value || selectedStake?.validatorInfo?.name
        : selectedStake?.providerName || selectedStake?.validatorInfo?.name;
      dispatch(
        setCurrentTransferData({
          validatorPubKey: selectedStake?.validator_address,
          stakingAddress: selectedStake?.staking_address,
          validatorName: selectedStake?.validatorInfo?.name,
          stakingProviderName,
          currentCoin,
          amount: validateBigNumberStr(amount),
          isStakingRewards: isStakingRewards,
          resourceType: resourceType?.value,
          isMaxCheckbox: isEVMUnstaking && isMaxCheckbox,
        }),
      );
      dispatch(
        calculateEstimateFee({
          isFetchNonce: true,
          fromAddress: currentCoin?.address,
          contractAddress:
            selectedStake?.validator_address || currentCoin?.contractAddress,
          amount: validateBigNumberStr(amount),
          tokenDecimals: currentCoin?.decimal,
          validatorPubKey: selectedStake?.validator_address,
          stakingAddress: selectedStake?.staking_address,
          isWithdrawStaking: isWithdrawStaking,
          isDeactivateStaking: isDeactivateStaking,
          isStakingRewards: isStakingRewards,
          resourceType: resourceType?.value,
          stakingProviderName,
          isMaxCheckbox: isEVMUnstaking && isMaxCheckbox,
        }),
      );
      dispatch(setExchangeSuccess(false));
      dispatch(
        setRouteStateData({
          transfer: {
            fromScreen: 'Staking',
            isDeactivateStaking,
            isWithdrawStaking,
            isStakingRewards,
          },
        }),
      );
      router.push(routes.coin.confirmStaking());
    } else {
      setWithdrawState({
        ...withdrawState,
        errors: localErrors,
      });
    }
  };

  const isWithdrawValid =
    (isEVMUnstaking && isMaxCheckbox) ||
    (validateNumber(withdrawState.amount) &&
      new BigNumber(withdrawState.amount).lte(
        new BigNumber(withdrawAvailableAmount),
      ));

  const setWithdrawMax = () => {
    setWithdrawState({
      ...withdrawState,
      amount: withdrawAvailableAmount,
      currencyAmount: withdrawAvailableAmountCurrency,
    });
  };

  const onWithdrawAmountChange = event => {
    const tempValues = validateNumberInInput(
      event.target.value,
      currentCoin?.decimal,
    );
    const tempAmount = multiplyBNWithFixed(
      tempValues,
      currentCoin?.currencyRate,
      2,
    );
    const localErrors = checkWithdrawError(tempValues, tempAmount);
    setWithdrawState({
      ...withdrawState,
      currencyAmount: tempAmount,
      amount: tempValues,
      errors: localErrors,
    });
  };

  const onWithdrawCurrencyAmountChange = event => {
    const tempValues = validateNumberInInput(event.target.value, 2);
    const tempAmount = new BigNumber(tempValues)
      .dividedBy(new BigNumber(currentCoin?.currencyRate))
      .toFixed(currentCoin?.decimal ? Number(currentCoin?.decimal) : 8);
    const localErrors = checkWithdrawError(tempAmount, tempValues);
    setWithdrawState({
      ...withdrawState,
      amount: tempAmount,
      currencyAmount: tempValues,
      errors: localErrors,
    });
  };

  const onWithdrawResourceTypeChange = value => {
    const selected = resourceData?.find(item => item?.value === value);
    setWithdrawState({...withdrawState, resourceType: selected});
  };

  // ---- Vote Staking ----

  const [voteValidatorsList, setVoteValidatorsList] = useState(
    validators.slice(0, 20),
  );
  const [voteSearchQuery, setVoteSearchQuery] = useState('');
  const [initialSelectedVotes, setInitialSelectedVotes] = useState(null);
  const displayItemRef = useRef(20);

  const voteAvailableAmount = useMemo(() => {
    const amount = currentCoin?.stakingBalance || '0';
    const stakingBalanceNumber = validateNumber(amount);
    if (stakingBalanceNumber) {
      return Math.floor(stakingBalanceNumber);
    }
    return 0;
  }, [currentCoin]);

  useEffect(() => {
    setVoteValidatorsList(validators.slice(0, displayItemRef.current));
  }, [validators]);

  useEffect(() => {
    if (screen === 'vote') {
      dispatch(fetchValidatorByChain({chain_name: currentCoin?.chain_name}));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Snapshot the votes as first seen once loading is done, so Next only
  // enables after the user changes something.
  if (
    screen === 'vote' &&
    !isStakingLoading &&
    !initialSelectedVotes &&
    selectedVotes
  ) {
    setInitialSelectedVotes(selectedVotes);
  }

  const handleVoteSubmit = async values => {
    const selectedValidators = Object.keys(selectedVotes);
    const displayValidators = [];
    const finalSelectedVotes = {};
    selectedValidators.forEach(item => {
      const tempValidator = validators.find(
        subItem => subItem?.validatorAddress === item,
      );
      if (tempValidator && selectedVotes[item]) {
        displayValidators.push({
          ...tempValidator,
          votes: selectedVotes[item],
        });
        finalSelectedVotes[item] = selectedVotes[item];
      }
    });
    dispatch(
      updateCurrentTransferData({
        selectedVotes: finalSelectedVotes,
        currentCoin,
        amount: values?.amount,
        displayValidators,
      }),
    );
    dispatch(
      calculateEstimateFee({
        isFetchNonce: true,
        fromAddress: currentCoin?.address,
        amount: values?.amount,
        selectedVotes: finalSelectedVotes,
        balance: voteAvailableAmount,
        isCreateVote: true,
      }),
    );
    dispatch(setExchangeSuccess(false));

    dispatch(
      setRouteStateData({
        transfer: {
          fromScreen: 'VoteStaking',
          isCreateStaking: false,
          isCreateVote: true,
        },
      }),
    );
    router.push(routes.coin.confirmStaking());
  };

  const handleVoteSearch = useCallback(
    event => {
      const value = event?.target.value;
      setVoteSearchQuery(value);
      if (value) {
        setVoteValidatorsList(
          validators.filter(item =>
            item?.name?.toLowerCase().includes(value?.toLowerCase()),
          ),
        );
      } else {
        setVoteValidatorsList(validators.slice(0, displayItemRef.current));
      }
    },
    [validators],
  );

  const clearVoteSearch = useCallback(() => {
    setVoteSearchQuery('');
    setVoteValidatorsList(validators.slice(0, displayItemRef.current));
  }, [validators]);

  const onVoteEndReached = useCallback(() => {
    if (!voteSearchQuery && voteValidatorsList.length !== validators.length) {
      displayItemRef.current += 20;
      setVoteValidatorsList(validators.slice(0, displayItemRef.current));
    }
  }, [voteSearchQuery, validators, voteValidatorsList.length]);

  const onPressAdd = useCallback(
    address => {
      dispatch(onAddVotes({address}));
    },
    [dispatch],
  );

  const onPressMinus = useCallback(
    address => {
      dispatch(onMinusVotes({address}));
    },
    [dispatch],
  );

  const onChangeText = useCallback(
    (address, value) => {
      dispatch(onChangeVotes({address, value}));
    },
    [dispatch],
  );

  const isVoteValid =
    voteAvailableAmount >= selectedTotal &&
    JSON.stringify(initialSelectedVotes) !== JSON.stringify(selectedVotes) &&
    selectedTotal > 0;

  const symbol = currentCoin?.symbol?.toUpperCase() ?? '';

  return {
    // Shared
    // Create Staking only fetches validators on chains that pick one (not
    // Tron), and the staking slice's `loading` starts as true, so don't wait
    // on it otherwise.
    isLoading:
      screen === 'list'
        ? isListLoading
        : screen === 'create' && !isValidatorSupport
          ? false
          : isStakingLoading,
    currentCoin,
    localCurrency,
    symbol,

    // Create Staking: balance
    availableAmount,
    availableAmountCurrency,

    // Create Staking: form
    formikRef,
    initialValues,
    validationSchema,
    handleSubmitForm,
    allowanceLoading,
    setMax,
    onAmountChange,
    onCurrencyAmountChange,

    // Create Staking: validator
    isValidatorSupport,
    validatorList,
    onValidatorChange,
    renderValidatorValue: value => findLabel(validatorList, value),

    // Create Staking: resource type
    isResourceSupport,
    resourceData,
    onResourceTypeChange,
    renderResourceValue: value => findLabel(resourceData, value),

    // Create Staking: allowance modal
    allowanceModalVisible,
    closeAllowanceModal,
    approveLoading,
    pendingAmount,
    pendingStakingProviderName,
    onAllowanceContinue,

    // Staking List: overview
    stakingInfo,
    onPressBoxItem,
    goToCreateStaking: () => router.push(routes.coin.createStaking()),
    isShowVote,
    goToValidators,
    isShowUnstaking,
    isEvmChain,
    unstakingDisableText,
    onUnstake,

    // Staking List: active staking
    staking,
    estimateEpochTimestamp,
    handleClaimReward,

    // Withdraw Staking: balance
    withdrawTitle,
    isStakingRewards,
    withdrawAvailableAmount,
    withdrawAvailableAmountCurrency,

    // Withdraw Staking: form
    withdrawAmount: withdrawState.amount,
    withdrawCurrencyAmount: withdrawState.currencyAmount,
    withdrawResourceType: withdrawState.resourceType,
    withdrawErrors: withdrawState.errors,
    withdrawAmountError:
      withdrawState.errors.amount || withdrawState.errors.currencyAmount,
    isEVMUnstaking,
    isMaxCheckbox,
    toggleMaxCheckbox: () => handleMaxCheckboxToggle(!isMaxCheckbox),
    disableTextInput,
    setWithdrawMax,
    onWithdrawAmountChange,
    onWithdrawCurrencyAmountChange,
    onWithdrawResourceTypeChange,
    handleWithdrawSubmit,
    isWithdrawValid,

    // Withdraw Staking: provider / validator
    selectedStake,
    stakingProviderList,
    hideResource,

    // Vote Staking
    voteValidatorsList,
    hasMoreValidators: validators.length !== voteValidatorsList.length,
    voteSearchQuery,
    handleVoteSearch,
    clearVoteSearch,
    onVoteEndReached,
    selectedVotes,
    selectedTotal,
    voteAvailableAmount,
    onPressAdd,
    onPressMinus,
    onChangeText,
    isVoteValid,
    handleVoteSubmit,
  };
};

export default useStaking;
