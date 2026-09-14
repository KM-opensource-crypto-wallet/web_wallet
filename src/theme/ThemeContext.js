'use client';

import {createContext, useEffect, useState} from 'react';
import changeTheme from 'utils/changeTheme';
import {
  getThemeFromLocalStorage,
  setThemeToLocalStorage,
} from 'utils/localStorageData';

const currentTheme = getThemeFromLocalStorage() || 'system';

const defaultThemeValue = {
  themeType: '',
  theme: currentTheme,
  changeTheme: value => {},
};

export const ThemeContext = createContext(defaultThemeValue);

export default function ThemeProvider({children}) {
  const [theme, setTheme] = useState(currentTheme);
  const [themeType, setThemeType] = useState('');

  if (!getThemeFromLocalStorage()) {
    setThemeToLocalStorage('system');
  }

  const handleChangeTheme = value => {
    setThemeToLocalStorage(value);
    setTheme(value);
  };

  useEffect(() => {
    if (theme !== 'system') {
      return;
    }
    const handleThemeChange = e => {
      if (e.matches) {
        changeTheme('dark');
        setThemeType('dark');
      } else {
        changeTheme('light');
        setThemeType('light');
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    handleThemeChange(mediaQuery);

    mediaQuery.addListener(handleThemeChange);

    return () => {
      mediaQuery.removeListener(handleThemeChange);
    };
  }, [theme]);

  useEffect(() => {
    if (theme === 'system') {
      return;
    }
    changeTheme(theme);
    setThemeToLocalStorage(theme);
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setThemeType(theme);
    })();
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeType,
        changeTheme: theme => handleChangeTheme(theme),
      }}>
      {children}
    </ThemeContext.Provider>
  );
}
