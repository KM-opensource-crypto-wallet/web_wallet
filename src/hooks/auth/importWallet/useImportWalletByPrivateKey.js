import {useState} from 'react';
import {useDispatch} from 'react-redux';
import {
  setChainName,
  setPhrase,
  setPrivateKey,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';

const INVALID_KEY = 'This private key is not valid for the selected network.';

// The "Private key" tab of the import screen: once the key is valid for the
// picked network it goes to the store and `onImported` runs.
export const useImportWalletByPrivateKey = ({onImported}) => {
  const dispatch = useDispatch();
  const [network, setNetwork] = useState(null);
  const [privateKey, setPrivateKeyValue] = useState('');
  const [keyError, setKeyError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canImportKey = !!network && privateKey.trim().length > 0;

  const onNetworkChange = value => {
    setNetwork(value);
    setKeyError('');
  };

  const onPrivateKeyChange = e => {
    setPrivateKeyValue(e.target.value);
    setKeyError('');
  };

  const submitPrivateKey = async () => {
    setIsSubmitting(true);
    try {
      const key = privateKey.trim();
      // Several chains validate asynchronously; an un-awaited Promise is
      // always truthy and would let any key through.
      const isValid = await getChain(network).isValidPrivateKey({
        privateKey: key,
      });
      if (!isValid) {
        setKeyError(INVALID_KEY);
        setIsSubmitting(false);
        return;
      }
      dispatch(setPhrase(null));
      dispatch(setChainName(network));
      dispatch(setPrivateKey(key));
      onImported();
    } catch (err) {
      console.error(`in importWallet: ${JSON.stringify(err)}`);
      setKeyError(INVALID_KEY);
      setIsSubmitting(false);
    }
  };

  return {
    network,
    onNetworkChange,
    privateKey,
    onPrivateKeyChange,
    keyError,
    isSubmitting,
    canImportKey,
    submitPrivateKey,
  };
};

export default useImportWalletByPrivateKey;
