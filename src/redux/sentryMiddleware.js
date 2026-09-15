import {addBreadcrumb} from 'services/logger';

// Every failed thunk (exchange quotes, staking, currency, batch...) becomes a
// breadcrumb on the next error report. Only the error message and a string
// payload are recorded; object payloads can carry wallet data.
export const rejectedActionBreadcrumb = () => next => action => {
  if (typeof action?.type === 'string' && action.type.endsWith('/rejected')) {
    addBreadcrumb(
      'redux',
      action.type,
      {
        error: action.error?.message,
        payload:
          typeof action.payload === 'string' ? action.payload : undefined,
      },
      'warning',
    );
  }
  return next(action);
};
