'use client';
import {useCallback, useEffect, useState} from 'react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {persistor, store} from 'redux/store';
import {Buffer} from 'buffer';
import 'utils/bigNumberConfig';
import {bootstrapStorage} from 'redux/storage/bootstrap';
import StorageErrorScreen from 'components/StorageErrorScreen';
import {captureError} from 'services/logger';
global.Buffer = Buffer;

// Nothing renders until IndexedDB is open and any legacy localStorage blob has
// been migrated (bootstrapStorage). A failure shows a blocking error screen:
// never fall through to an empty store, which would route a funded user to
// onboarding. The server has nothing to open, but it starts at `booting` too:
// the first client render must produce the same (empty) markup as the server,
// and only the effect below, which runs in the browser alone, moves on.
//
// Retry is a full page reload, not a re-run of the bootstrap in place. The
// store module calls persistStore() at import time, so redux-persist has
// already asked the adapters for every plain slice; when the bootstrap
// rejected, those reads rejected too and redux-persist rehydrated the slices
// as initial state (persistReducer treats a failed getStoredState as
// "nothing stored"). A second bootstrap that succeeds could not undo that:
// the slices would stay empty and the persistoid would write that empty
// state over the real data. A fresh page load restarts the rehydration.
const StorageGate = ({children}) => {
  const [status, setStatus] = useState('booting');
  const [error, setError] = useState(null);

  // State only changes from the promise callbacks (never synchronously inside
  // the effect), which is what the react-hooks compiler rule asks for.
  const run = useCallback(
    () =>
      bootstrapStorage().then(
        () => setStatus('ready'),
        bootError => {
          captureError(bootError, {
            level: 'fatal',
            tags: {area: 'storage', op: 'bootstrap'},
          });
          setError(bootError);
          setStatus('fatal');
        },
      ),
    [],
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      run();
    }
  }, [run]);

  if (status === 'fatal') {
    return (
      <StorageErrorScreen
        error={error}
        onRetry={() => {
          window.location.reload();
        }}
      />
    );
  }
  if (status === 'booting') {
    return null;
  }
  return children;
};

const StateProvider = ({children}) => {
  return (
    <Provider store={store}>
      <StorageGate>
        <PersistGate loading={null} persistor={persistor}>
          {children}
        </PersistGate>
      </StorageGate>
    </Provider>
  );
};
export default StateProvider;
