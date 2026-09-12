import {showToast} from 'utils/toast';

// Copies `text` and confirms with a success toast. Returns whether the copy
// succeeded so callers can skip follow-up UI when the clipboard is blocked.
export const copyToClipboard = async (text, title = 'Address copied') => {
  if (!text) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast({type: 'successToast', title});
    return true;
  } catch (e) {
    console.warn('copy to clipboard failed', e?.message);
    showToast({type: 'errorToast', title: 'Copy failed'});
    return false;
  }
};
