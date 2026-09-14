'use client';
import React, {useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import RefreshIcon from '@mui/icons-material/Refresh';
import CircularProgress from '@mui/material/CircularProgress';
import {selectIsRefreshingAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {refreshAllWalletsCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {showToast} from 'utils/toast';

// Refreshes the balances of every visible wallet, one wallet at a time. Port
// of the mobile screens/main/Wallets/RefreshWalletsButton: reads its own
// loading state so the parent does not re-render on every tick. `className`
// lets the caller style it for its slot (the Wallets header icon buttons).
const RefreshWalletsButton = ({className}) => {
  const dispatch = useDispatch();
  const isRefreshing = useSelector(selectIsRefreshingAllWallets);

  const onPress = useCallback(async () => {
    try {
      const result = await dispatch(refreshAllWalletsCoins()).unwrap();
      if (result?.failed > 0) {
        showToast({
          type: 'warningToast',
          title: 'Some balances were not refreshed',
          message: `${result.failed} of ${result.total} wallets could not be updated. Please try again.`,
        });
      }
    } catch (e) {
      // A run already in flight rejects via the thunk `condition`; the
      // button is disabled in that case, so anything here is a real failure.
      showToast({
        type: 'errorToast',
        title: 'Refresh failed',
        message: 'Could not refresh wallet balances. Please try again.',
      });
    }
  }, [dispatch]);

  return (
    <button
      type='button'
      className={className}
      onClick={onPress}
      disabled={isRefreshing}
      aria-label='Refresh all wallet balances'
      aria-busy={isRefreshing}>
      {isRefreshing ? (
        <CircularProgress size={20} sx={{color: 'currentColor'}} />
      ) : (
        <RefreshIcon />
      )}
    </button>
  );
};

export default RefreshWalletsButton;
