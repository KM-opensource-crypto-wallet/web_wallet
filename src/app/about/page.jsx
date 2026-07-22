'use client';

// import { div, Text, TouchableOpacity } from "react-native";
// import myStyles from "./AboutScreenStyles";
import {aboutList} from 'data/aboutList';
// import { ThemeContext } from "../../../../../ThemeContext";
// import { useContext } from "react";

const icons = require(`assets/images/icons`).default;

import s from './About.module.css';
import {useRouter} from 'next/navigation';

const AboutScreen = () => {
  // const { theme } = useContext(ThemeContext);
  // const styles = myStyles(theme);

  const router = useRouter();
  return (
    <div className={s.section}>
      {aboutList.map((item, index) => (
        <button
          key={index}
          className={s.list}
          onClick={() => {
            if (item.url) {
              window.open(item.url, '_blank', 'noopener,noreferrer');
            } else {
              router.push(item.route);
            }
          }}>
          <div className={s.box}>
            <div className={s.iconBox}>{item.icon}</div>
            <p className={s.title}>{item.page}</p>
          </div>
          <span className={s.arrow}>{icons.arrRight}</span>
          {/* <KeyboardArrow height="30" width="30" className={s.arrow} /> */}
        </button>
      ))}
    </div>
  );
};

export default AboutScreen;
