import React from 'react';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon} from 'components/Home/HomeIcons';
import useNavigation from 'src/hooks/navigation/useNavigation';

import s from './TopBar.module.css';

// Sticky screen header: back button, centred title (or a custom `center`),
// and an optional `right` action. Without `right` an empty spacer keeps the
// centre content centred. `className` lets a screen adjust the bar.
const TopBar = ({title, subtitle, center, right, onBack, className}) => {
  const {goBack} = useNavigation();

  return (
    <div className={className ? `${s.topBar} ${className}` : s.topBar}>
      <GeneralButton
        variant='unstyled'
        className={s.iconButton}
        aria-label='Back'
        onClick={onBack ?? goBack}>
        <ChevronLeftIcon size={24} />
      </GeneralButton>
      {center ?? (
        <div className={s.heading}>
          <h1 className={s.title}>{title}</h1>
          {subtitle ? <span className={s.subtitle}>{subtitle}</span> : null}
        </div>
      )}
      {right || <span className={s.iconSpacer} aria-hidden='true' />}
    </div>
  );
};

export default TopBar;
