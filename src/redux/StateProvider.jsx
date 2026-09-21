'use client';
import {useCallback, useEffect, useState} from 'react';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {persistor, store} from 'redux/store';
import {Buffer} from 'buffer';
import 'utils/bigNumberConfig';
import {bootstrapStorage, resetBootstrap} from 'redux/storage/bootstrap';
import StorageErrorScreen from 'components/StorageErrorScreen';
import {captureError} from 'services/logger';
global.Buffer = Buffer;

// Nothing renders until IndexedDB is open and any legacy localStorage blob has
// been migrated (bootstrapStorage). A failure shows a blocking error screen:
// never fall through to an empty store, which would route a funded user to
// onboarding. On the server there is nothing to open; render straight through
// so hydration markup matches.
const StorageGate = ({children}) => {
  const [status, setStatus] = useState(() =>
    typeof window === 'undefined' ? 'ready' : 'booting',
  );
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
          resetBootstrap();
          setStatus('booting');
          run();
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
