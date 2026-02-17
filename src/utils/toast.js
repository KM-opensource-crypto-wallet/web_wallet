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

export const showToast = ({type, title, message, ...options}) => {
  if (options?.toastId) {
    toast.dismiss(options?.toastId);
  }
  if (type === 'progressToast' || type === 'progress') {
    return toast.loading(customView(title, message), {autoClose: false});
  } else if (type === 'successToast' || type === 'success') {
    return toast.success(customView(title, message));
  } else if (type === 'warningToast' || type === 'warning') {
    return toast.warning(customView(title, message));
  } else if (type === 'errorToast' || type === 'error') {
    return toast.error(customView(title, message));
  } else if (type === 'messageToast' || type === 'message') {
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
