import {showToast} from 'utils/toast';

// Copies `text` and confirms with a success toast. Returns whether the copy
// succeeded so callers can skip follow-up UI when the clipboard is blocked.
// `toastOptions` overrides the success toast (e.g. {type: 'copyToast'}).
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
    showToast({type: 'successToast', title, ...toastOptions});
    return true;
  } catch (e) {
    console.warn('copy to clipboard failed', e?.message);
    showToast({type: 'errorToast', title: 'Copy failed'});
    return false;
  }
};
