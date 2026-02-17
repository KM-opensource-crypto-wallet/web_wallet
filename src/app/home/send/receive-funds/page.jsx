'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import {
  selectCurrentCoin,
  getCurrentWalletPhrase,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {Grid2 as Grid, Typography, TextField} from '@mui/material';
import CopyIcon from '@mui/icons-material/FileCopyOutlined';
import s from './RecieveFunds.module.css';
import GoBackButton from 'components/GoBackButton';
import QRCode from 'react-qr-code';
import {showToast} from 'utils/toast';
import LightningDropDown from 'src/components/LightningDropDown';
import {getChain} from 'dok-wallet-blockchain-networks/cryptoChain';

const ReceiveFunds = () => {
  const currentCoin = useSelector(selectCurrentCoin);
  const currentPhrase = useSelector(getCurrentWalletPhrase);
  const [productQRref, setProductQRref] = useState(
    `${currentCoin?.symbol}:${currentCoin.address}`,
  );
  const isLightning = currentCoin?.chain_name === 'bitcoin_lightning';
  const address = useRef('');
  address.current = currentCoin?.address ?? '';
  const chain = getChain(currentCoin?.chain_name);
  const [addressState, setAddressState] = useState('');
  const [showBtcMainnetBanner, setShowBtcMainnetBanner] = useState(false);

  useEffect(() => {
    setAddressState('');
    setProductQRref(`${currentCoin?.symbol}:${currentCoin?.address ?? ''}`);
  }, [currentCoin.address, currentCoin?.symbol]);

  const onPressCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(
      addressState ? addressState : address.current,
    );
    showToast({
      type: 'successToast',
      title: 'Address copied',
    });
  }, [addressState]);

  const handleLightningDropDownChange = useCallback(
    async currentValue => {
      try {
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
    [chain, currentCoin?.symbol, currentPhrase],
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
        <Grid container spacing={1} alignItems='center'>
          <Grid size='grow'>
            <TextField
              value={addressState ? addressState : address.current}
              className={s.address}
              // variant="outlined"
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
            <button className={s.copyButton} onClick={onPressCopyAddress}>
              <CopyIcon />
              <span>Copy</span>
            </button>
          </Grid>
        </Grid>
      </div>
    </div>
  );
};

export default ReceiveFunds;
