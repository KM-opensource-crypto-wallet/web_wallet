'use client';
import {useCallback, useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {Grid2 as Grid, Typography, TextField} from '@mui/material';
import CopyIcon from '@mui/icons-material/FileCopyOutlined';
import s from './RecieveFunds.module.css';
import GoBackButton from 'components/GoBackButton';
import QRCode from 'react-qr-code';
import {showToast} from 'utils/toast';

const ReceiveFunds = () => {
  const currentCoin = useSelector(selectCurrentCoin);
  const [productQRref, setProductQRref] = useState(
    `${currentCoin?.symbol}:${currentCoin.address}`,
  );

  useEffect(() => {
    setProductQRref(`${currentCoin?.symbol}:${currentCoin.address}`);
  }, [currentCoin.address, currentCoin?.symbol]);

  const onPressCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(currentCoin.address);
    showToast({
      type: 'successToast',
      title: 'Address copied',
    });
  }, [currentCoin.address]);

  return (
    <div className={s.container}>
      <div className={s.goBack}>
        <GoBackButton />
      </div>
      <div style={{padding: 20}}>
        <Typography variant='h5' className={s.title}>
          Receive funds by providing your address or QR code
        </Typography>
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
              value={currentCoin?.address}
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
