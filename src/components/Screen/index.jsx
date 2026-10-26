import React from 'react';
import TopBar from 'components/TopBar';

import s from './Screen.module.css';

// Page shell for the redesigned screens: warm surface, accent glow and the
// sticky TopBar, with the screen's content below. `className` carries the
// screen's own colour variables and layout, `topBarClassName` tweaks the
// header; everything else is passed to TopBar.
const Screen = ({className, topBarClassName, children, ...topBarProps}) => (
  <main className={className ? `${s.screen} ${className}` : s.screen}>
    <div className={s.glow} aria-hidden='true' />
    <TopBar className={topBarClassName} {...topBarProps} />
    {children}
  </main>
);

export default Screen;
