'use client';
import {SessionProvider} from 'next-auth/react';
import {ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {useContext} from 'react';
import {ThemeContext} from 'theme/ThemeContext';

export default function AuthProvider({children}) {
  const {themeType} = useContext(ThemeContext) || {themeType: 'light'};
  return (
    <SessionProvider>
      {children}
      <ToastContainer
        position='bottom-right'
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={themeType === 'dark' ? 'dark' : 'light'}
      />
    </SessionProvider>
  );
}
