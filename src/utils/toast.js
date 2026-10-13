import {toast} from 'react-toastify';
import {addBreadcrumb} from 'services/logger';
import styles from './toast.module.css';

const TOAST_BREADCRUMB_LEVEL = {
  errorToast: 'error',
  warningToast: 'warning',
  rpcError: 'error',
};

const customView = (title, message, onViewTransaction) => {
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div style={{fontSize: 14}}>{title}</div>
      {!!message && <div style={{fontSize: 12}}>{message}</div>}
      {!!onViewTransaction && (
        <button
          onClick={onViewTransaction}
          style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--primary, #6c63ff)',
            background: 'none',
            border: 'none',
            padding: 0,
            textDecoration: 'underline',
            cursor: 'pointer',
            textAlign: 'left',
          }}>
          View Transaction Details →
        </button>
      )}
    </div>
  );
};

// Copy confirmation in the redesigned style. `props.warning` adds a caution
// line, used when the copied text is a secret (private key, phrase).
const CopyToastView = ({title, message, warning}) => (
  <div className={styles.body}>
    <span className={styles.icon} aria-hidden='true'>
      <svg width='18' height='18' viewBox='0 0 24 24'>
        <path
          d='M5 12.5l4.5 4.5L19 7.5'
          stroke='currentColor'
          strokeWidth='2.4'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </span>
    <div className={styles.text}>
      <span className={styles.title}>{title}</span>
      {!!message && <span className={styles.message}>{message}</span>}
      {!!warning && (
        <span className={styles.warning}>
          <svg width='13' height='13' viewBox='0 0 24 24' aria-hidden='true'>
            <path
              d='M12 9v4m0 4h.01M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          {warning}
        </span>
      )}
    </div>
  </div>
);

const RpcErrorMsg = ({chain_name, toastId}) => {
  const {useDispatch} = require('react-redux');
  const {
    deleteCustomRpc,
  } = require('dok-wallet-blockchain-networks/redux/customRpc/customRpcSlice');
  const dispatch = useDispatch();
  const displayName = chain_name
    ? chain_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Unknown';

  const onPress = () => {
    if (!chain_name) return;
    dispatch(deleteCustomRpc({chain_name}));
    if (toastId) toast.dismiss(toastId);
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
      <div style={{fontSize: 14, fontWeight: 600}}>Custom RPC Error</div>
      <div style={{fontSize: 12}}>
        {`Your custom RPC for ${displayName} is not responding.`}
      </div>
      <button
        onClick={onPress}
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--primary, #6c63ff)',
          background: 'none',
          border: 'none',
          padding: 0,
          textDecoration: 'underline',
          cursor: 'pointer',
          textAlign: 'left',
        }}>
        Change to Default RPC
      </button>
    </div>
  );
};

export const showToast = ({type, title, message, props, ...options}) => {
  // Every error/warning the user sees becomes context on the next report.
  // Title only: messages can carry addresses or amounts.
  const breadcrumbLevel = TOAST_BREADCRUMB_LEVEL[type];
  if (breadcrumbLevel) {
    addBreadcrumb('ui.toast', title || type, undefined, breadcrumbLevel);
  }
  if (options?.toastId) {
    toast.dismiss(options?.toastId);
  }
  if (type === 'rpcError') {
    if (!props?.chain_name) {
      return toast.error(
        customView('Custom RPC Error', 'RPC is not responding.'),
        {
          autoClose: false,
        },
      );
    }
    const toastId = `rpcError_${props?.chain_name}`;
    return toast.error(
      <RpcErrorMsg chain_name={props?.chain_name} toastId={toastId} />,
      {autoClose: false, toastId},
    );
  } else if (type === 'copyToast') {
    return toast(
      <CopyToastView
        title={title}
        message={message}
        warning={props?.warning}
      />,
      {
        className: styles.copyToast,
        position: 'top-center',
        autoClose: 2500,
        hideProgressBar: true,
        closeButton: false,
        icon: false,
        ...options,
      },
    );
  } else if (type === 'progressToast') {
    return toast.loading(customView(title, message, props?.onViewTransaction), {
      autoClose: false,
    });
  } else if (type === 'successToast') {
    return toast.success(customView(title, message, props?.onViewTransaction));
  } else if (type === 'warningToast') {
    return toast.warning(customView(title, message));
  } else if (type === 'errorToast') {
    return toast.error(customView(title, message));
  }
};
