'use client';
import {useContext} from 'react';
import {useRouter} from 'next/navigation';
import {ThemeContext} from 'theme/ThemeContext';
import GeneralButton from 'components/Button';
import {CheckIcon, ChevronLeftIcon, InfoIcon} from 'components/Home/HomeIcons';
import s from './DisplayTheme.module.css';

const themeList = [
  {
    label: 'System',
    hint: 'Match your device',
    theme: 'system',
  },
  {label: 'Light', hint: 'Warm and bright', theme: 'light'},
  {label: 'Dark', hint: 'Easy on the eyes', theme: 'dark'},
];

// Miniature of the wallet in the given theme; `system` shows both halves.
const Preview = ({theme}) => (
  <span className={`${s.preview} ${s[`preview_${theme}`]}`} aria-hidden='true'>
    {theme === 'system' ? <span className={s.previewHalf} /> : null}
    <span className={s.previewCard}>
      <span className={s.previewDot} />
      <span className={s.previewLines}>
        <span className={s.previewLine} />
        <span className={`${s.previewLine} ${s.previewLineShort}`} />
      </span>
    </span>
    <span className={s.previewButton} />
  </span>
);

const DisplayTheme = () => {
  const router = useRouter();
  const {theme, changeTheme} = useContext(ThemeContext);

  return (
    <main className={s.page}>
      <div className={s.glow} aria-hidden='true' />
      <div className={s.topBar}>
        <GeneralButton
          variant='unstyled'
          className={s.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <h1 className={s.title}>Theme</h1>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

      <div className={s.column}>
        <h2 className={s.sectionLabel}>Appearance</h2>
        <div className={s.grid} role='radiogroup' aria-label='Theme'>
          {themeList.map(item => {
            const selected = theme === item.theme;
            return (
              <button
                key={item.theme}
                type='button'
                role='radio'
                aria-checked={selected}
                className={`${s.option} ${selected ? s.optionActive : ''}`}
                onClick={() => {
                  if (!selected) {
                    changeTheme(item.theme);
                  }
                }}>
                <Preview theme={item.theme} />
                <span className={s.optionFoot}>
                  <span className={s.optionText}>
                    <span className={s.optionTitle}>{item.label}</span>
                    <span className={s.optionHint}>{item.hint}</span>
                  </span>
                  <span className={s.check} aria-hidden='true'>
                    {selected ? <CheckIcon size={14} strokeWidth={3} /> : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className={s.note}>
          <InfoIcon size={16} />
          <span>
            System follows your device setting and switches automatically
            between light and dark.
          </span>
        </p>
      </div>
    </main>
  );
};

export default DisplayTheme;
