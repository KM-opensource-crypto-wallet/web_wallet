import {showToast} from 'utils/toast';

// Copies `text` and confirms with the themed copy toast. Returns whether the copy
// succeeded so callers can skip follow-up UI when the clipboard is blocked.
// `toastOptions` overrides the toast (e.g. {message, props: {warning}}).
export const copyToClipboard = async (
  text,
  title = 'Address copied',
  toastOptions,
) => {
  if (!text) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    // Plain copies keep the container's bottom-right spot; callers asking
    // for the copy toast themselves get its own top-center placement.
    showToast({
      type: 'copyToast',
      title,
      ...(!toastOptions?.type && {position: 'bottom-right'}),
      ...toastOptions,
    });
    return true;
  } catch (e) {
    console.warn('copy to clipboard failed', e?.message);
    showToast({type: 'errorToast', title: 'Copy failed'});
    return false;
  }
};
