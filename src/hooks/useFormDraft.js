import {useEffect, useMemo} from 'react';
import {usePathname} from 'next/navigation';
import {useFormikContext} from 'formik';

// What the user typed into a multi-step form (Send, Stake, Buy, Sell), kept
// so that coming back to the form (Back from the next step, or leaving and
// reopening it) shows those values instead of its defaults. Memory only:
// nothing is written to storage, so a reload drops it, and a submitted send
// drops it once its success redirect reaches Home.
const drafts = new Map();
let clearOnHome = false;

// Called as a send is submitted. Not cleared right away: a failed send stays
// on the confirm screen, and Back from there must still find the form.
export const clearFormDraftsOnHome = () => {
  clearOnHome = true;
};

export const cancelClearFormDraftsOnHome = () => {
  clearOnHome = false;
};

// Called when Home mounts: a successful send redirects there.
export const consumeClearFormDrafts = () => {
  if (clearOnHome) {
    clearOnHome = false;
    drafts.clear();
  }
};

// `suffix` adds to the route key what else decides the form's defaults, such
// as the Send screen's QR/deep-link query: a new link gets a fresh form.
export const useFormDraft = (suffix = '') => {
  const pathname = usePathname();
  const draftKey = suffix ? `${pathname}?${suffix}` : pathname;
  // Read once per key: Formik's enableReinitialize would otherwise reset the
  // form on every keystroke as the saved draft changes.
  const draft = useMemo(() => drafts.get(draftKey), [draftKey]);
  return {draftKey, draft};
};

// Rendered inside <Formik>: mirrors the form's values into the draft.
export const FormDraftSync = ({draftKey}) => {
  const {values} = useFormikContext();
  useEffect(() => {
    drafts.set(draftKey, values);
  }, [draftKey, values]);
  return null;
};
