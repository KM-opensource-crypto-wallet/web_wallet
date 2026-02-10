import {useCallback, useContext, useState} from 'react';
import {
  getCurrentWalletPhrase,
  selectBtcLightningUnClaimed,
  selectCurrentCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {useSelector} from 'react-redux';
import {BitcoinLightningChain} from 'dok-wallet-blockchain-networks/cryptoChain/chains/BitcoinLightningChain';
import * as bitcoin from 'bitcoinjs-lib';
import {config} from 'dok-wallet-blockchain-networks/config/config';
import Loading from '../Loading';
import {ThemeContext} from 'src/theme/ThemeContext';
import {
  Receipt,
  ContentCopy,
  CheckCircle,
  Cancel,
  Undo,
  ErrorOutline,
  Bolt,
  HourglassEmpty,
} from '@mui/icons-material';
import {showToast} from 'utils/toast';

export const BtcLightningUnclaimedData = ({hideModal}) => {
  const [activeRejectIndex, setActiveRejectIndex] = useState(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [addressValidationError, setAddressValidationError] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const unClaimedData = useSelector(selectBtcLightningUnClaimed);
  const {theme} = useContext(ThemeContext);
  const styles = getStyles(theme);
  const currentCoin = useSelector(selectCurrentCoin);
  const currentPhrase = useSelector(getCurrentWalletPhrase);

  const handleApprove = useCallback(
    async (item, index) => {
      try {
        setLoadingIndex(index);
        const lightningChain = await BitcoinLightningChain(
          currentCoin?.chain_name,
          currentPhrase,
        );
        const response = await lightningChain.approveClaimedBtc(
          item.txid,
          item.vout,
        );
        if (response) {
          hideModal(false);
        }
        setLoadingIndex(null);
      } catch (error) {
        setLoadingIndex(null);
      }
    },
    [currentCoin?.chain_name, currentPhrase, hideModal],
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
        const {txid, amount, vout} = item;
        if (
          !isValidBTCAddress(destinationAddress, config.BITCOIN_NETWORK_STRING)
        ) {
          setAddressValidationError(true);
          setLoadingIndex(null);
          return;
        }
        setAddressValidationError(false);
        const lightningChain = await BitcoinLightningChain(
          currentCoin?.chain_name,
          currentPhrase,
        );
        const response = await lightningChain.rejectClaimRequest(
          txid,
          vout,
          destinationAddress,
        );
        if (response) {
          hideModal(false);
        }
        setLoadingIndex(null);
      } catch (error) {
        console.log('error:', error);
        setLoadingIndex(null);
      }
    },
    [currentCoin?.chain_name, currentPhrase, destinationAddress, hideModal],
  );

  const handleCopyTxid = useCallback(txid => {
    try {
      navigator.clipboard.writeText(txid);
      showToast({
        type: 'successToast',
        title: 'Copied!',
        message: 'Transaction ID copied',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  return (
    <>
      {/* Header Section */}
      <div style={styles.headerSection}>
        <div style={styles.headerTop}>
          <div style={styles.headerIconContainer}>
            <Bolt sx={{fontSize: 32}} htmlColor='#f59e0b' />
          </div>
          <div style={styles.headerContent}>
            <h2 style={styles.headerTitle}>Lightning Claims</h2>
            <p style={styles.headerSubtitle}>
              Review and manage your pending Bitcoin Lightning claims
            </p>
          </div>
        </div>
        <div style={styles.claimCountBadge}>
          <span style={styles.claimCountNumber}>
            {unClaimedData?.length || 0}
          </span>
          <span style={styles.claimCountLabel}>
            {unClaimedData?.length === 1 ? 'Claim' : 'Claims'}
          </span>
        </div>
      </div>

      <div style={styles.list}>
        {unClaimedData?.length > 0 ? (
          unClaimedData.map((item, index) => {
            const shortTx =
              item.txid?.slice(0, 6) + '...' + item.txid?.slice(-6);

            const showInput = activeRejectIndex === index;

            return (
              <div key={index}>
                {loadingIndex === index ? (
                  <div style={styles.card}>
                    <div style={styles.loaderContainer}>
                      <Loading
                        height='auto'
                        size={32}
                        color='var(--background)'
                      />
                      <span style={styles.loaderText}>
                        Processing transaction...
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.card}>
                    {/* Header with Status Badge */}
                    <div style={styles.cardHeader}>
                      <div style={styles.statusBadge}>
                        <HourglassEmpty
                          sx={{fontSize: 16}}
                          htmlColor='#ffcc00'
                        />
                        <span style={styles.statusText}>Pending Claim</span>
                      </div>
                      <Bolt sx={{fontSize: 20}} htmlColor='var(--background)' />
                    </div>

                    {/* Transaction ID Row */}
                    <div style={styles.infoRow}>
                      <div style={styles.infoLabel}>
                        <Receipt sx={{fontSize: 18}} htmlColor='var(--gray)' />
                        <span style={styles.labelText}>Transaction ID</span>
                      </div>
                      <div style={styles.infoValue}>
                        <span style={styles.txidText}>{shortTx}</span>
                        <button
                          style={styles.copyBtn}
                          onClick={() => handleCopyTxid(item.txid)}
                          aria-label='Copy transaction ID'>
                          <ContentCopy sx={{fontSize: 16}} />
                        </button>
                      </div>
                    </div>

                    {/* Amount Row */}
                    <div style={styles.amountRow}>
                      <div style={styles.infoLabel}>
                        <Bolt sx={{fontSize: 18}} htmlColor='var(--gray)' />
                        <span style={styles.labelText}>Amount</span>
                      </div>
                      <div style={styles.amountValue}>
                        <span style={styles.amountText}>{item.amount}</span>
                        <span style={styles.currencyText}>BTC</span>
                      </div>
                    </div>

                    {/* Reject Input Section */}
                    {showInput && (
                      <div style={styles.rejectSection}>
                        <div style={styles.inputContainer}>
                          <label style={styles.inputLabel}>
                            Refund Destination Address
                          </label>
                          <input
                            style={styles.input}
                            placeholder='Enter BTC address...'
                            value={destinationAddress}
                            onChange={e =>
                              setDestinationAddress(e.target.value)
                            }
                          />
                          {addressValidationError && (
                            <div style={styles.errorMessage}>
                              <ErrorOutline sx={{fontSize: 16}} />
                              <span>Invalid Bitcoin address</span>
                            </div>
                          )}
                        </div>

                        <div style={styles.btnRow}>
                          <button
                            style={{...styles.btn, ...styles.btnSecondary}}
                            onClick={handleCancel}>
                            <Cancel sx={{fontSize: 18}} />
                            <span>Cancel</span>
                          </button>

                          <button
                            style={{...styles.btn, ...styles.btnWarning}}
                            onClick={() => handleRefund(item, index)}>
                            <Undo sx={{fontSize: 18}} />
                            <span>Refund</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!showInput && (
                      <div style={styles.btnRow}>
                        <button
                          style={{...styles.btn, ...styles.btnDanger}}
                          onClick={() => handleReject(index)}>
                          <Cancel sx={{fontSize: 18}} />
                          <span>Reject</span>
                        </button>

                        <button
                          style={{...styles.btn, ...styles.btnSuccess}}
                          onClick={() => handleApprove(item, index)}>
                          <CheckCircle sx={{fontSize: 18}} />
                          <span>Approve</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div style={styles.emptyState}>
            <HourglassEmpty sx={{fontSize: 48}} htmlColor='var(--gray)' />
            <p style={styles.emptyStateTitle}>No Pending Claims</p>
            <p style={styles.emptyStateText}>
              You don&apos;t have any unclaimed Bitcoin transactions at the
              moment
            </p>
          </div>
        )}
      </div>
    </>
  );
};

const getStyles = theme => ({
  headerSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    padding: '20px',
    background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    borderRadius: '16px',
    border: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
    boxShadow:
      theme === 'dark'
        ? '0 4px 20px rgba(0, 0, 0, 0.4)'
        : '0 4px 20px rgba(0, 0, 0, 0.08)',
  },

  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
  },

  headerIconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background:
      theme === 'dark'
        ? 'linear-gradient(135deg, #2a1f0a 0%, #1a1a1a 100%)'
        : 'linear-gradient(135deg, #fff9f0 0%, #ffe4b5 100%)',
    border: `2px solid ${theme === 'dark' ? '#3a2a0a' : '#ffd580'}`,
  },

  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  headerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--title)',
    margin: 0,
    lineHeight: '1.3',
  },

  headerSubtitle: {
    fontSize: '14px',
    color: 'var(--gray)',
    margin: 0,
    lineHeight: '1.4',
  },

  claimCountBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '70px',
    padding: '12px 16px',
    borderRadius: '12px',
    background:
      theme === 'dark'
        ? 'linear-gradient(135deg, #1a4d2e 0%, #0f3a1f 100%)'
        : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    border: `2px solid ${theme === 'dark' ? '#10b981' : '#10b981'}`,
  },

  claimCountNumber: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#10b981',
    lineHeight: '1',
    fontFamily: 'monospace',
  },

  claimCountLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: theme === 'dark' ? '#86efac' : '#059669',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '4px',
  },

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '420px',
    overflowY: 'auto',
    paddingRight: '8px',
  },

  card: {
    background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow:
      theme === 'dark'
        ? '0 4px 20px rgba(0, 0, 0, 0.4)'
        : '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'all 0.2s ease',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#f0f0f0'}`,
  },

  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '20px',
    background: theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
    color: 'var(--gray)',
    fontSize: '13px',
    fontWeight: '500',
  },

  statusText: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#ffcc00',
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },

  amountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderRadius: '12px',
    background: theme === 'dark' ? '#0f0f0f' : '#f8f9fa',
    border: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#e9ecef'}`,
  },

  infoLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  labelText: {
    fontSize: '14px',
    color: 'var(--gray)',
    fontWeight: '500',
  },

  infoValue: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  txidText: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: 'var(--title)',
    fontWeight: '500',
  },

  copyBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--background)',
    transition: 'all 0.2s ease',
    ':hover': {
      background: theme === 'dark' ? '#2a2a2a' : '#f0f0f0',
    },
  },

  amountValue: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },

  amountText: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'monospace',
  },

  currencyText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#10b981',
  },

  rejectSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
    borderRadius: '12px',
    background: theme === 'dark' ? '#0f0f0f' : '#fff9f0',
    border: `1px solid ${theme === 'dark' ? '#2a2a2a' : '#ffe4b5'}`,
  },

  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  inputLabel: {
    fontSize: '14px',
    color: 'var(--title)',
    fontWeight: '600',
  },

  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    border: `2px solid ${theme === 'dark' ? '#2a2a2a' : '#e0e0e0'}`,
    background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    color: 'var(--title)',
    fontSize: '14px',
    fontFamily: 'monospace',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },

  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: '500',
    marginTop: '4px',
  },

  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
  },

  btn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },

  btnSuccess: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  },

  btnDanger: {
    background: theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
    color: '#ef4444',
    border: `1px solid ${theme === 'dark' ? '#3a3a3a' : '#e5e5e5'}`,
  },

  btnWarning: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
  },

  btnSecondary: {
    background: theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
    color: 'var(--title)',
    border: `1px solid ${theme === 'dark' ? '#3a3a3a' : '#e5e5e5'}`,
  },

  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '32px',
  },

  loaderText: {
    fontSize: '14px',
    color: 'var(--gray)',
    fontWeight: '500',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    gap: '12px',
  },

  emptyStateTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--title)',
    margin: '0',
  },

  emptyStateText: {
    fontSize: '14px',
    color: 'var(--gray)',
    margin: '0',
    maxWidth: '300px',
  },
});
