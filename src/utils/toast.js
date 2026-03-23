import {toast} from 'react-toastify';

export const Msg = ({title, message, onClick}) => {
  return (
    <div onClick={onClick}>
      <p>{title}</p>
      <p>{message}</p>
    </div>
  );
};

const customView = (title, message) => {
  return (
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div style={{fontSize: 14}}>{title}</div>
      {!!message && <div style={{fontSize: 12}}>{message}</div>}
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
    return toast.loading(customView(title, message), {autoClose: false});
  } else if (type === 'successToast') {
    return toast.success(customView(title, message));
  } else if (type === 'warningToast') {
    return toast.warning(customView(title, message));
  } else if (type === 'errorToast') {
    return toast.error(customView(title, message));
  } else if (type === 'messageToast') {
    return toast(<Msg {...{title, message, onClick: options?.onClick}} />, {
      icon: (
        <svg
          viewBox='0 0 24 24'
          data-testid='ChatIcon'
          style={{fill: 'var(--background)'}}>
          <path d='M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M6 9h12v2H6zm8 5H6v-2h8zm4-6H6V6h12z'></path>
        </svg>
      ),
      hideProgressBar: true,
    });
  }
};
