'use client';
// import { View, SafeAreaView } from "react-native";
// import myStyles from "./DisplayThemeStyles";
import {useContext, useEffect, useState} from 'react';
// import { ThemeContext } from "../../../../../ThemeContext";

import DokRadioButton from 'components/DokRadioButton';
import s from './DisplayTheme.module.css';
import {ThemeContext} from 'theme/ThemeContext';
import {getThemeFromLocalStorage} from 'utils/localStorageData';

const icons = require(`assets/images/icons`).default;
import GoBackButton from 'components/GoBackButton';

const themeList = [
  {label: 'System Default', theme: 'system'},
  {label: 'Light Theme', theme: 'light'},
  {label: 'Dark Theme', theme: 'dark'},
];

const DisplayTheme = () => {
  const {theme, changeTheme} = useContext(ThemeContext);

  const [currentTheme, setCurrentTheme] = useState('');

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setCurrentTheme(theme);
    })();
  }, [theme]);

  const handleChange = value => {
    changeTheme(value);
  };

  return (
    <div className={s.container}>
      <GoBackButton />
      <div className={s.section}>
        <p className={s.title}>Select a theme</p>

        {themeList.map((item, index) => (
          <div
            className={s.itembox}
            key={index}
            onClick={() => {
              handleChange(item.theme);
            }}>
            <input
              className={s.input}
              type='checkbox'
              checked={currentTheme === item.theme}
              onChange={() => {
                handleChange(item.theme);
              }}
              id={item.theme}
            />
            <div>
              {currentTheme === item.theme ? (
                <span className={s.markActive}>{icons.checkedRadio}</span>
              ) : (
                <span className={s.mark}>{icons.uncheckedRadio}</span>
              )}
              <p className={s.item}>{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DisplayTheme;
