import {toast} from 'react-toastify';
import {addBreadcrumb} from 'services/logger';

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
