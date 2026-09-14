'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import {
  selectCurrentCoin,
  getCurrentWalletPhrase,
  selectCurrentWallet,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {Grid2 as Grid, Typography, TextField} from '@mui/material';
import CopyIcon from '@mui/icons-material/FileCopyOutlined';
import s from './RecieveFunds.module.css';
import GoBackButton from 'components/GoBackButton';
import QRCode from 'react-qr-code';
import {copyToClipboard} from 'utils/copyToClipboard';
import LightningDropDown from 'src/components/LightningDropDown';
import {useHederaAccountId} from 'src/hooks/useHederaAccount';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';
import {
  getCustomRPCWithData,
  selectAllCustomRpc,
} from 'dok-wallet-blockchain-networks/redux/customRpc/customRpcSelectors';

// Read-only identifier with a copy button; used for the address and, on
// Hedera, the ledger account id.
const IdentifierRow = ({value, onCopy}) => (
  <Grid container spacing={1} alignItems='center'>
    <Grid size='grow'>
      <TextField
        value={value}
        className={s.address}
        fullWidth
        sx={{
          '& fieldset': {
            borderColor: 'var(--whiteOutline) !important',
          },
        }}
        slotProps={{
          input: {
            readOnly: true,
            style: {color: 'var(--sidebarIcon)'},
          },
        }}
      />
    </Grid>
    <Grid>
      <button className={s.copyButton} onClick={onCopy}>
        <CopyIcon />
        <span>Copy</span>
      </button>
    </Grid>
  </Grid>
);

const ReceiveFunds = () => {
  const currentCoin = useSelector(selectCurrentCoin);
  const currentPhrase = useSelector(getCurrentWalletPhrase);
  const [productQRref, setProductQRref] = useState(
    `${currentCoin?.symbol}:${currentCoin.address}`,
  );
  const isLightning = currentCoin?.chain_name === 'bitcoin_lightning';
  const isHedera = currentCoin?.chain_name === 'hedera';
  // The Hedera address is always the EVM address; the ledger account id
  // (`0.0.N`) is assigned by the first deposit and stored on the coin. A live
  // lookup covers a wallet funded since the last coin refresh.
  const hederaAccountId = useHederaAccountId({
    coin: currentCoin,
    phrase: currentPhrase,
  });
  const address = useRef('');
  address.current = currentCoin?.address ?? '';
  const [addressState, setAddressState] = useState('');
  const [showBtcMainnetBanner, setShowBtcMainnetBanner] = useState(false);
  const currentWallet = useSelector(selectCurrentWallet);
  const allCustomRPC = useSelector(selectAllCustomRpc);
  useEffect(() => {
    setAddressState('');
    setProductQRref(`${currentCoin?.symbol}:${currentCoin?.address ?? ''}`);
  }, [currentCoin.address, currentCoin?.symbol]);

  const onPressCopyAddress = useCallback(() => {
    copyToClipboard(addressState ? addressState : address.current);
  }, [addressState]);

  const onPressCopyAccountId = useCallback(() => {
    copyToClipboard(hederaAccountId, 'Account ID copied');
  }, [hederaAccountId]);

  const handleLightningDropDownChange = useCallback(
    async currentValue => {
      try {
        const customRPC = getCustomRPCWithData(
          allCustomRPC,
          currentCoin?.chain_name,
          currentWallet?.clientId,
        );
        const chain = getChain(
          currentCoin?.chain_name,
          currentWallet?.phrase,
          customRPC,
        );
        let newAddress = '';

        if (currentValue === 'btc_mainnet') {
          const {address} =
            await chain.generateInvoiceViaBitcoinAddress(currentPhrase);
          newAddress = address;
          setShowBtcMainnetBanner(true);
        } else if (currentValue === 'invoice') {
          const {address} = await chain.generateInvoiceViaBolt11(currentPhrase);
          newAddress = address;
          setShowBtcMainnetBanner(false);
        } else if (currentValue === 'lightning_address') {
          // generateSparkAddress
          const {address} = await chain.generateSparkAddress(currentPhrase);
          newAddress = address;
          setShowBtcMainnetBanner(false);
        }

        setAddressState(newAddress);
        setProductQRref(`${currentCoin?.symbol}:${newAddress}`);
      } catch (error) {
        console.log(error);
      }
    },
    [
      allCustomRPC,
      currentCoin?.chain_name,
      currentCoin?.symbol,
      currentPhrase,
      currentWallet?.clientId,
      currentWallet?.phrase,
    ],
  );
  return (
    <div className={s.container}>
      <div className={s.goBack}>
        <GoBackButton />
      </div>
      <div style={{padding: 20}}>
        {showBtcMainnetBanner && (
          <div className={s.bannerContainer}>
            <p className={s.bannerText}>
              Note: On-chain BTC deposits require 4 confirmations before the
              balance is available. You will need to manually claim the deposit
              once confirmed.
            </p>
          </div>
        )}
        <Typography variant='h5' className={s.title}>
          Receive funds by providing your address or QR code
        </Typography>

        <LightningDropDown
          isLightning={isLightning}
          handleLightningDropDownChange={handleLightningDropDownChange}
        />
        <div className={s.qrContainer}>
          <QRCode
            value={productQRref}
            size={250}
            bgColor='var(--backgroundColor)'
            fgColor='var(--font)'

            // ref={qrCodeRef}
          />
        </div>
        <Typography variant='h6' className={s.addressTitle}>
          YOUR ADDRESS
        </Typography>
        <IdentifierRow
          value={addressState ? addressState : address.current}
          onCopy={onPressCopyAddress}
        />
        {isHedera && (
          <>
            <Typography variant='h6' className={s.addressTitle}>
              ACCOUNT ID
            </Typography>
            {hederaAccountId ? (
              <IdentifierRow
                value={hederaAccountId}
                onCopy={onPressCopyAccountId}
              />
            ) : (
              <p className={s.hederaNote}>
                Assigned automatically after your first HBAR deposit. Anyone can
                send HBAR to the address above; the sender covers the one-time
                account creation fee.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReceiveFunds;
