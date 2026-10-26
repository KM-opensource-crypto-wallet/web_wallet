import {useCallback, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {useDispatch} from 'react-redux';
import {toast} from 'react-toastify';
import {
  loadingOff,
  loadingOn,
  signUpSuccess,
} from 'dok-wallet-blockchain-networks/redux/auth/authSlice';
import {PASSWORD_RULES} from 'src/data/lists/passwordRules';
import {UNLOCK_ERROR_CODES, createAccount} from 'security/unlockFlow';
import {captureError} from 'services/logger';
import {validationSchemaRegistration} from 'utils/validationSchema';
import {REGISTRATION_INITIAL_VALUES} from 'src/data/constants';

// Weak until every rule passes (Create stays disabled), Good once it does,
// Strong from 12 characters.
const getStrength = (password, allMet) => {
  if (!password) {
    return {score: 0, label: ''};
  }
  if (!allMet) {
    return {score: 1, label: 'Weak'};
  }
  return password.length >= 12
    ? {score: 3, label: 'Strong'}
    : {score: 2, label: 'Good'};
};

// Everything the form renders from the current values: the rule checklist,
// strength meter, confirm-field state and whether Create is enabled.
const getPasswordState = ({password, passConfirm}) => {
  const rules = PASSWORD_RULES.map(rule => ({
    ...rule,
    met: rule.test(password),
  }));
  const allMet = rules.every(rule => rule.met);
  const matched = passConfirm.length > 0 && password === passConfirm;
  const mismatch = passConfirm.length > 0 && password !== passConfirm;
  return {
    rules,
    allMet,
    strength: getStrength(password, allMet),
    matched,
    mismatch,
    canSubmit: allMet && matched,
  };
};

export const useRegistration = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  // Wallets from earlier are still saved in this browser: 'found' offers the
  // restore, 'confirmDelete' is the second, explicit step before replacing.
  const [vaultPrompt, setVaultPrompt] = useState(null);
  const [pendingValues, setPendingValues] = useState(null);
  const searchParamsStr = `${searchParams ? `?${searchParams}` : ''}`;

  // The password never gets stored: it wraps a fresh vault key, and sealed
  // persistence opens under the key derived from it.
  const handleSubmit = useCallback(
    async (values, options) => {
      dispatch(loadingOn());
      try {
        await dispatch(createAccount(values.password, options));
      } catch (error) {
        dispatch(loadingOff());
        if (error?.code === UNLOCK_ERROR_CODES.VAULT_EXISTS) {
          setPendingValues(values);
          setVaultPrompt('found');
          return;
        }
        if (error?.code === UNLOCK_ERROR_CODES.ACCOUNT_EXISTS) {
          // Reached registration with an account on this device (e.g. a typed
          // URL inside the auto-lock window): never replace its vault here.
          toast.error(error.message);
          router.replace(`/auth/login${searchParamsStr}`);
          return;
        }
        captureError(error, {tags: {area: 'vault', op: 'create'}});
        toast.error(
          'Could not create secure storage for your wallet. Please try again.',
        );
        return;
      }
      dispatch(signUpSuccess());
      router.push(`/auth/reset-wallet${searchParamsStr}`);
    },
    [dispatch, router, searchParamsStr],
  );

  const onRestoreInstead = useCallback(() => {
    setVaultPrompt(null);
    setPendingValues(null);
    router.replace(`/auth/restore-from-device${searchParamsStr}`);
  }, [router, searchParamsStr]);

  const onConfirmDelete = useCallback(() => {
    const values = pendingValues;
    setVaultPrompt(null);
    setPendingValues(null);
    if (values) {
      handleSubmit(values, {discardExistingVault: true});
    }
  }, [handleSubmit, pendingValues]);

  const onCancelVaultPrompt = useCallback(() => {
    setVaultPrompt(null);
    setPendingValues(null);
  }, []);

  return {
    initialValues: REGISTRATION_INITIAL_VALUES,
    validationSchema: validationSchemaRegistration,
    // Formik passes its helpers as the second argument; keep them out of the
    // createAccount options.
    handleSubmit: values => handleSubmit(values),
    getPasswordState,
    vaultPrompt,
    setVaultPrompt,
    onRestoreInstead,
    onConfirmDelete,
    onCancelVaultPrompt,
  };
};

export default useRegistration;
