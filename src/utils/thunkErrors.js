import {captureError} from 'services/logger';
import {showToast} from 'utils/toast';

// `.catch` handler for `dispatch(thunk()).unwrap()` calls that have no other
// error handling. `unwrap()` rethrows the rejected payload as-is, so a thunk
// that used `rejectWithValue('some text')` rejects with a plain string; left
// uncaught that surfaces in Sentry as a "Non-Error promise rejection" with no
// stack. captureError wraps non-Error values, and the tags say where it came
// from.
export const reportThunkRejection =
  ({area, op, toast}) =>
  error => {
    captureError(error, {tags: {area, op}});
    if (toast) {
      showToast({type: 'errorToast', title: toast});
    }
  };
