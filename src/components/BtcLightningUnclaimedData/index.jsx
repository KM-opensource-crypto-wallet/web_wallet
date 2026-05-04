import {useCallback, useMemo, useState} from 'react';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {useDispatch, useSelector} from 'react-redux';
import * as bitcoin from 'bitcoinjs-lib';
import {config} from 'dok-wallet-blockchain-networks/config/config';
import Loading from '../Loading';
import {
  Receipt,
  CheckCircle,
  ErrorOutline,
  Bolt,
  CurrencyBitcoin,
  Layers,
  ArrowCircleDown,
  AccountBalanceWallet,
  TaskAlt,
} from '@mui/icons-material';
import {showToast} from 'utils/toast';
import ModalConfirmTransaction from '../ModalConfirmTransaction';
import {handleUnclaimedData} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import styles from './BtcLightningUnclaimedData.module.css';

export const BtcLightningUnclaimedData = ({hideModal}) => {
  const [activeRejectIndex, setActiveRejectIndex] = useState(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [addressValidationError, setAddressValidationError] = useState(false);
  const [confirmationIndex, setConfirmationIndex] = useState(null);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const currentCoin = useSelector(selectCurrentCoin);
  const unClaimedData = useMemo(() => {
    return currentCoin?.listOfUnClaimedDeposits || [];
  }, [currentCoin]);
  const dispatch = useDispatch();

  const handleApprove = useCallback(
    async (item, index) => {
      try {
        setConfirmationIndex(null);
        setLoadingIndex(index);
        const unClaimedDataLength = unClaimedData?.length;
        await dispatch(
          handleUnclaimedData({
            action: 'approve',
            currentCoin,
            txData: {
              txid: item.txid,
              vout: item.vout,
              fees: item.fees,
            },
          }),
        ).unwrap();
        setLoadingIndex(null);
        if (unClaimedDataLength === 1) {
          hideModal();
        }
      } catch (error) {
        console.log('error:', error);
        setLoadingIndex(null);
        showToast({
          type: 'errorToast',
          title: 'Something went wrong',
          message: error?.message || error,
        });
      }
    },
    [currentCoin, dispatch, hideModal, unClaimedData?.length],
  );

  const handleReject = useCallback(index => {
    setActiveRejectIndex(index);
  }, []);

  const handleCancel = useCallback(() => {
    setActiveRejectIndex(null);
    setDestinationAddress('');
    setAddressValidationError(false);
  }, []);

  const isValidBTCAddress = (address, network) => {
    try {
      bitcoin.address.toOutputScript(address, network);
      return true;
    } catch {
      return false;
    }
  };

  const handleRefund = useCallback(
    async (item, index) => {
      try {
        setLoadingIndex(index);
        if (
          !isValidBTCAddress(destinationAddress, config.BITCOIN_NETWORK_STRING)
        ) {
          setAddressValidationError(true);
          setLoadingIndex(null);
          return;
        }
        setAddressValidationError(false);
        const unClaimedDataLength = unClaimedData?.length;
        await dispatch(
          handleUnclaimedData({
            action: 'reject',
            currentCoin,
            txData: {
              txid: item.txid,
              vout: item.vout,
              fees: item.fees,
              destinationAddress,
            },
          }),
        ).unwrap();
        setLoadingIndex(null);
        if (unClaimedDataLength === 1) {
          hideModal();
        }
      } catch (error) {
        console.log('error:', error);
        setLoadingIndex(null);
      }
    },
    [
      currentCoin,
      destinationAddress,
      dispatch,
      hideModal,
      unClaimedData?.length,
    ],
  );

  const trimTxId = txid => {
    if (!txid) return '';
    return `${txid.slice(0, 6)}........${txid.slice(-6)}`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerContainer}>
        <div className={styles.headerIconWrapper}>
          <Bolt sx={{fontSize: 28}} htmlColor='var(--background)' />
        </div>
        <h2 className={styles.headerTitle}>Lightning Claims</h2>
        <p className={styles.headerSubtitle}>
          Review and manage your pending Bitcoin Lightning claims
        </p>
        {unClaimedData?.length > 0 && (
          <div className={styles.claimsCountBadge}>
            <span className={styles.claimsCountText}>
              {unClaimedData.length}{' '}
              {unClaimedData.length === 1 ? 'Claim' : 'Claims'} Pending
            </span>
          </div>
        )}
      </div>

      {/* List */}
      <div className={styles.listContent}>
        {unClaimedData?.length > 0 ? (
          unClaimedData.map((item, index) => {
            const showInput = activeRejectIndex === index;
            return (
              <div key={`${item.txid}-${index}`} className={styles.card}>
                {loadingIndex === index ? (
                  <div className={styles.loadingContainer}>
                    <Loading
                      height='auto'
                      size={32}
                      color='var(--background)'
                    />
                    <span className={styles.loadingText}>
                      Processing transaction...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Amount Section */}
                    <div className={styles.amountSection}>
                      <div className={styles.amountIconContainer}>
                        <CurrencyBitcoin
                          sx={{fontSize: 32}}
                          htmlColor='var(--background)'
                        />
                      </div>
                      <div className={styles.amountDetails}>
                        <span className={styles.amountLabel}>
                          Amount to Claim
                        </span>
                        <span className={styles.amountValue}>
                          {item.amount} BTC
                        </span>
                      </div>
                    </div>

                    {/* Transaction Info */}
                    <div className={styles.infoSection}>
                      <div className={styles.infoItem}>
                        <div className={styles.infoLabelRow}>
                          <Receipt
                            sx={{fontSize: 16}}
                            htmlColor='var(--gray)'
                          />
                          <span className={styles.infoLabel}>
                            Transaction ID
                          </span>
                        </div>
                        <span className={styles.infoValue}>
                          {trimTxId(item.txid)}
                        </span>
                      </div>

                      <div className={styles.infoItem}>
                        <div className={styles.infoLabelRow}>
                          <Layers sx={{fontSize: 16}} htmlColor='var(--gray)' />
                          <span className={styles.infoLabel}>Fees</span>
                        </div>
                        <span className={styles.infoValue}>
                          {Number(item.fees || 0).toFixed(8)} BTC
                        </span>
                      </div>

                      <div className={styles.infoItem}>
                        <div className={styles.infoLabelRow}>
                          <ArrowCircleDown
                            sx={{fontSize: 16}}
                            htmlColor='var(--gray)'
                          />
                          <span className={styles.infoLabel}>
                            Receive Amount
                          </span>
                        </div>
                        <span className={styles.infoValue}>
                          {Number(item.receivedAmount || 0).toFixed(8)} BTC
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className={styles.divider} />

                    {/* Address Input Section */}
                    {showInput ? (
                      <div className={styles.refundSection}>
                        <div className={styles.refundHeader}>
                          <AccountBalanceWallet
                            sx={{fontSize: 20}}
                            htmlColor='var(--font)'
                          />
                          <span className={styles.refundTitle}>
                            Refund Destination
                          </span>
                        </div>
                        <p className={styles.refundDescription}>
                          Enter the Bitcoin address where you want to receive
                          the refund
                        </p>

                        <input
                          className={styles.textInput}
                          placeholder='Bitcoin address'
                          value={destinationAddress}
                          onChange={e => setDestinationAddress(e.target.value)}
                        />

                        {addressValidationError && (
                          <div className={styles.errorContainer}>
                            <ErrorOutline
                              sx={{fontSize: 16}}
                              htmlColor='#e60000'
                            />
                            <span className={styles.errorText}>
                              Invalid Bitcoin address
                            </span>
                          </div>
                        )}

                        {/* <div className={styles.actionButtons}>
                          <button
                            className={styles.buttonSecondary}
                            onClick={() => handleCancel(item, index)}>
                            <Cancel
                              sx={{fontSize: 20}}
                              htmlColor='var(--font)'
                            />
                            <span className={styles.buttonSecondaryText}>
                              Cancel
                            </span>
                          </button>

                          <button
                            className={styles.buttonPrimary}
                            onClick={() => handleRefund(item, index)}>
                            <Undo
                              sx={{fontSize: 20}}
                              htmlColor='var(--title)'
                            />
                            <span className={styles.buttonPrimaryText}>
                              Refund
                            </span>
                          </button>
                        </div> */}
                      </div>
                    ) : (
                      <div className={styles.actionButtons}>
                        {/* <button
                          className={styles.buttonSecondary}
                          onClick={() => handleReject(index)}>
                          <Cancel
                            sx={{fontSize: 20}}
                            htmlColor='var(--font)'
                          />
                          <span className={styles.buttonSecondaryText}>
                            Reject
                          </span>
                        </button> */}

                        <button
                          className={styles.buttonPrimary}
                          onClick={() => setConfirmationIndex(index)}>
                          <CheckCircle
                            sx={{fontSize: 20}}
                            htmlColor='var(--title)'
                          />
                          <span className={styles.buttonPrimaryText}>
                            Approve
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                )}
                <ModalConfirmTransaction
                  hideModal={() => {
                    setConfirmationIndex(null);
                  }}
                  visible={confirmationIndex === index}
                  onSuccess={() => handleApprove(item, index)}
                />
              </div>
            );
          })
        ) : (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIconContainer}>
              <TaskAlt sx={{fontSize: 64}} htmlColor='var(--gray)' />
            </div>
            <p className={styles.emptyTitle}>No Pending Claims</p>
            <p className={styles.emptyDescription}>
              You don&apos;t have any unclaimed Lightning transactions at the
              moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
