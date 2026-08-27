'use client';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {persistor, store} from 'redux/store';
import {Buffer} from 'buffer';
import 'utils/bigNumberConfig';
global.Buffer = Buffer;

const StateProvider = ({children}) => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
};
export default StateProvider;
