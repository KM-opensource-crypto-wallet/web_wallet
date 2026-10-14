import {toast} from 'react-toastify';
import {addBreadcrumb} from 'services/logger';
import styles from './toast.module.css';

const TOAST_BREADCRUMB_LEVEL = {
  errorToast: 'error',
  warningToast: 'warning',
  rpcError: 'error',
};

// Stroke glyphs drawn inside the accent chip, keyed by toast type.
const ICON_PATHS = {
  default: 'M5 12.5l4.5 4.5L19 7.5',
  success: 'M5 12.5l4.5 4.5L19 7.5',
  error: 'M7 7l10 10M17 7L7 17',
  warning: 'M12 7v6.5M12 17.5h.01',
  info: 'M12 11v6M12 7h.01',
};

// Icon for every toast, passed to <ToastContainer icon>. The chip colour
// comes from the card's `--tt-accent`, set per type in app/toast.css.
export const ToastIcon = ({type, isLoading}) => {
  if (isLoading) {
    return <span className={styles.spinner} aria-hidden='true' />;
  }
  return (
    <span className={styles.icon} aria-hidden='true'>
      <svg width='18' height='18' viewBox='0 0 24 24'>
        <path
          d={ICON_PATHS[type] || ICON_PATHS.default}
          stroke='currentColor'
          strokeWidth='2.4'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </span>
  );
};

const ToastText = ({title, message, children}) => (
  <div className={styles.text}>
    <span className={styles.title}>{title}</span>
    {!!message && <span className={styles.message}>{message}</span>}
    {children}
  </div>
);

const customView = (title, message, onViewTransaction) => (
  <ToastText title={title} message={message}>
    {!!onViewTransaction && (
      <button className={styles.action} onClick={onViewTransaction}>
        View transaction details →
      </button>
    )}
  </ToastText>
);

// Copy confirmation. `props.warning` adds a caution line, used when the
// copied text is a secret (private key, phrase).
const CopyToastView = ({title, message, warning}) => (
  <ToastText title={title} message={message}>
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
  </ToastText>
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
    <ToastText
      title='Custom RPC Error'
      message={`Your custom RPC for ${displayName} is not responding.`}>
      <button className={styles.action} onClick={onPress}>
        Change to default RPC
      </button>
    </ToastText>
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
        position: 'top-center',
        autoClose: 2500,
        hideProgressBar: true,
        closeButton: false,
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
