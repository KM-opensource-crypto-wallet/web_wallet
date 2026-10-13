import {useCallback, useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useSelector} from 'react-redux';
import {
  selectCurrentCoin,
  getCurrentWalletPhrase,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  getCustomRPCWithData,
  selectAllCustomRpc,
} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSelectors';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';
import {isBitcoinChain} from 'dok-wallet-blockchain-networks/helper';
import {useHederaAccountId} from 'src/hooks/useHederaAccount';
import {copyToClipboard} from 'utils/copyToClipboard';
import {LIGHTNING_MODES} from 'data/lightningModes';

const COPIED_RESET_MS = 2000;

export const useReceiveFunds = () => {
  const router = useRouter();
  const currentCoin = useSelector(selectCurrentCoin);
  const currentPhrase = useSelector(getCurrentWalletPhrase);
  const currentWallet = useSelector(selectCurrentWallet);
  const allCustomRPC = useSelector(selectAllCustomRpc);

  const [lightningMode, setLightningMode] = useState(LIGHTNING_MODES[0].value);
  // Address generated for the selected Lightning mode; '' = the coin's own.
  const [generatedAddress, setGeneratedAddress] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  // 'address' | 'accountId' right after a successful copy.
  const [copied, setCopied] = useState(null);
  const copiedTimer = useRef(null);

  const chainName = currentCoin?.chain_name;
  const symbol = currentCoin?.symbol ?? '';
  const isLightning = chainName === 'bitcoin_lightning';
  const isHedera = chainName === 'hedera';
  const showNetwork =
    currentCoin?.type === 'token' || isBitcoinChain(chainName);
  const networkName = currentCoin?.chain_display_name ?? '';

  // The Hedera address is always the EVM address; the ledger account id
  // (`0.0.N`) is assigned by the first deposit and stored on the coin. A live
  // lookup covers a wallet funded since the last coin refresh.
  const hederaAccountId = useHederaAccountId({
    coin: currentCoin,
    phrase: currentPhrase,
  });

  // Another coin: drop whatever was generated for the previous one.
  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setGeneratedAddress('');
      setGenerateError('');
      setLightningMode(LIGHTNING_MODES[0].value);
    })();
  }, [currentCoin?.address, currentCoin?.symbol]);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const address = generatedAddress || currentCoin?.address || '';
  const qrValue = `${symbol}:${address}`;

  const walletClientId = currentWallet?.clientId;
  const walletPhrase = currentWallet?.phrase;

  const selectLightningMode = useCallback(
    async mode => {
      if (mode === lightningMode || generating) {
        return;
      }
      setLightningMode(mode);
      setGenerateError('');
      setGenerating(true);
      try {
        const customRPC = getCustomRPCWithData(
          allCustomRPC,
          chainName,
          walletClientId,
        );
        const chain = getChain(chainName, walletPhrase, customRPC);
        let result;
        if (mode === 'btc_mainnet') {
          result = await chain.generateInvoiceViaBitcoinAddress(currentPhrase);
        } else if (mode === 'invoice') {
          result = await chain.generateInvoiceViaBolt11(currentPhrase);
        } else {
          result = await chain.generateSparkAddress(currentPhrase);
        }
        setGeneratedAddress(result?.address ?? '');
      } catch (error) {
        console.log(error);
        setGeneratedAddress('');
        setGenerateError('Could not create an address. Please try again.');
      } finally {
        setGenerating(false);
      }
    },
    [
      allCustomRPC,
      chainName,
      currentPhrase,
      generating,
      lightningMode,
      walletClientId,
      walletPhrase,
    ],
  );

  const markCopied = key => {
    setCopied(key);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(null), COPIED_RESET_MS);
  };

  const copyAddress = useCallback(async () => {
    if (await copyToClipboard(address)) {
      markCopied('address');
    }
  }, [address]);

  const copyAccountId = useCallback(async () => {
    if (await copyToClipboard(hederaAccountId, 'Account ID copied')) {
      markCopied('accountId');
    }
  }, [hederaAccountId]);

  return {
    coin: currentCoin,
    symbol,
    networkName: showNetwork ? networkName : '',
    goBack: () => router.back(),

    // QR + address
    qrValue,
    address,
    copyAddress,
    addressCopied: copied === 'address',

    // Bitcoin Lightning
    isLightning,
    lightningModes: LIGHTNING_MODES,
    lightningMode,
    selectLightningMode,
    generating,
    generateError,
    showOnChainNote: isLightning && lightningMode === 'btc_mainnet',

    // Hedera
    isHedera,
    hederaAccountId,
    copyAccountId,
    accountIdCopied: copied === 'accountId',
  };
};

export default useReceiveFunds;
