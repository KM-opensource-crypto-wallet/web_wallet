import Modal from '@mui/material/Modal';
import {useRouter} from 'next/navigation';
import {
  setChainName,
  setPhrase,
  setPrivateKey,
} from 'dok-wallet-blockchain-networks/redux/extraData/extraDataSlice';
import {useDispatch} from 'react-redux';
import GeneralButton from 'components/Button';
import {ChevronRightIcon, PlusIcon} from 'components/Home/HomeIcons';
// Same sheet / dialog look as the Reset Wallet and Log out confirmation.
import styles from 'components/ModalReset/ModalReset.module.css';
import s from './ModalCreateWallet.module.css';

const DownloadIcon = () => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'>
    <path d='M12 3v12' />
    <path d='m7 10 5 5 5-5' />
    <path d='M5 21h14' />
  </svg>
);

// Create or import a wallet (from the Wallets list and the wallet switcher).
// Bottom sheet on phones, centred dialog from 600px up.
const ModalCreateWallet = ({visible, hideModal}) => {
  const router = useRouter();
  const dispatch = useDispatch();

  return (
    <Modal
      open={visible}
      onClose={() => hideModal(false)}
      slotProps={{backdrop: {className: styles.backdrop}}}>
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={s.options}>
          <GeneralButton
            variant='unstyled'
            fullWidth
            className={s.option}
            onClick={() => {
              hideModal(false);
              dispatch(setPhrase(null));
              dispatch(setPrivateKey(null));
              dispatch(setChainName(null));
              router.push('/wallets/create-wallet');
            }}>
            <span className={s.optionIcon}>
              <PlusIcon size={20} />
            </span>
            <span className={s.optionText}>
              <span className={s.optionTitle}>{"I don't have a wallet"}</span>
              <span className={s.optionDescription}>
                {'Create a new multi-chain wallet'}
              </span>
            </span>
            <ChevronRightIcon size={18} className={s.chevron} />
          </GeneralButton>
          <GeneralButton
            variant='unstyled'
            fullWidth
            className={s.option}
            onClick={() => {
              hideModal(false);
              hideModal(false);
              router.push('/wallets/import-wallet');
            }}>
            <span className={s.optionIcon}>
              <DownloadIcon />
            </span>
            <span className={s.optionText}>
              <span className={s.optionTitle}>{'I already have a wallet'}</span>
              <span className={s.optionDescription}>{'Import a wallet'}</span>
            </span>
            <ChevronRightIcon size={18} className={s.chevron} />
          </GeneralButton>
        </div>
      </div>
    </Modal>
  );
};

export default ModalCreateWallet;
