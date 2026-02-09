import {useCallback, useContext, useState} from 'react';
import {
  getCurrentWalletPhrase,
  selectCurrentCoin,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {useSelector} from 'react-redux';
import {BitcoinLightningChain} from 'dok-wallet-blockchain-networks/cryptoChain/chains/BitcoinLightningChain';
import * as bitcoin from 'bitcoinjs-lib';
import {config} from 'dok-wallet-blockchain-networks/config/config';
import Loading from '../Loading';
import {ThemeContext} from 'src/theme/ThemeContext';

export const BtcLightningUnclaimedData = ({unClaimedData}) => {
  const [activeRejectIndex, setActiveRejectIndex] = useState(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [addressValidationError, setAddressValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const {theme} = useContext(ThemeContext);
  const styles = getStyles(theme);

  const currentCoin = useSelector(selectCurrentCoin);
  const currentPhrase = useSelector(getCurrentWalletPhrase);

  const handleApprove = useCallback(
    async item => {
      try {
        setLoading(true);
        const lightningChain = await BitcoinLightningChain(
          currentCoin?.chain_name,
          currentPhrase,
        );
        await lightningChain.approveClaimedBtc(item.txid, item.vout);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    },
    [currentCoin?.chain_name, currentPhrase],
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
    async item => {
      try {
        setLoading(true);
        const {txid, amount, vout} = item;
        if (
          !isValidBTCAddress(destinationAddress, config.BITCOIN_NETWORK_STRING)
        ) {
          setAddressValidationError(true);
          setLoading(false);
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
          // Refresh page
        }
        setLoading(false);
      } catch (error) {
        console.log('error:', error);
        setLoading(false);
      }
    },
    [currentCoin?.chain_name, currentPhrase, destinationAddress],
  );

  return (
    <>
      <div style={styles.list}>
        {unClaimedData?.length > 0 ? (
          unClaimedData.map((item, index) => {
            const shortTx =
              item.txid?.slice(0, 6) + '...' + item.txid?.slice(-6);

            const showInput = activeRejectIndex === index;

            return (
              <div key={index}>
                {loading ? (
                  <span style={styles.loaderBtnContainer}>
                    <Loading height='auto' size={26} color='var(--title)' />
                    <span style={styles.loaderBtnText}>Loading...</span>
                  </span>
                ) : (
                  <div style={styles.card}>
                    <div style={styles.row}>
                      <span style={styles.label}>Txid:</span>
                      <span style={styles.value}>{shortTx}</span>
                    </div>

                    <div style={styles.row}>
                      <span style={styles.label}>Amount:</span>
                      <span style={styles.amount}>{item.amount} BTC</span>
                    </div>

                    {showInput && (
                      <>
                        <label style={styles.inputLabel}>
                          Destination Address
                        </label>

                        <input
                          style={styles.input}
                          value={destinationAddress}
                          onChange={e => setDestinationAddress(e.target.value)}
                        />

                        {addressValidationError && (
                          <div style={styles.invalidCheck}>InValid Address</div>
                        )}

                        <div style={styles.btnRow}>
                          <div
                            style={{...styles.btn, ...styles.shadow}}
                            onClick={handleCancel}>
                            <p style={styles.btnText}>Cancel</p>
                          </div>

                          <div
                            style={{...styles.btn, ...styles.shadow}}
                            onClick={() => handleRefund(item)}>
                            <p style={styles.btnText}>Refund</p>
                          </div>
                        </div>
                      </>
                    )}

                    {!showInput && (
                      <div style={styles.btnRow}>
                        <div
                          style={{...styles.btn, ...styles.shadow}}
                          onClick={() => handleReject(index)}>
                          <p style={styles.btnText}>Reject</p>
                        </div>

                        <div
                          style={{...styles.btn, ...styles.shadow}}
                          onClick={() => handleApprove(item)}>
                          <p style={styles.btnText}>Approve</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p>No unclaimed data</p>
        )}
      </div>
    </>
  );
};

const getStyles = theme => ({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',

    height: '420px', // fixed height
    overflowY: 'auto', // scroll when more cards
    paddingRight: '6px',
  },

  card: {
    background: theme === 'dark' ? '#161616' : '#fff',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  label: {
    fontSize: '12px',
    color: '#888',
  },

  value: {
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#ddd',
    marginLeft: '10px',
  },

  amount: {
    fontWeight: '600',
    color: '#4caf50',
  },

  btnRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
    justifyContent: 'flex-end',
  },

  btn: {
    backgroundColor: 'var(--background)',
    width: '160px',
    height: '60px',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    cursor: 'pointer',
  },

  inputLabel: {
    marginTop: '12px',
    color: '#fff',
    fontWeight: 600,
  },

  input: {
    marginTop: '6px',
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    background: '#242424',
    color: 'white',
    width: '100%',
  },

  invalidCheck: {
    color: '#ff2525',
  },

  loaderBtnContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loaderBtnText: {
    marginLeft: '12px',
  },
});
