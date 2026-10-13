'use client';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {aboutList} from 'data/aboutList';
import {APP_VERSION} from 'utils/common';
import {getAppIcon, getAppTitle} from 'whitelabel/whiteLabelInfo';
import GeneralButton from 'components/Button';
import {ChevronLeftIcon, ChevronRightIcon} from 'components/Home/HomeIcons';
import {ExternalLinkIcon} from 'components/Transactions/TxIcons';
import {DocIcon, ShieldIcon} from '../settings/SettingsIcons';
import s from './About.module.css';

// Line icons for the known entries; anything else keeps its own icon.
const ROW_ICONS = {
  '/about/terms-conditions': DocIcon,
  '/about/privacy-policy': ShieldIcon,
};

const AboutScreen = () => {
  const router = useRouter();

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
        <h1 className={s.title}>About</h1>
        <span className={s.iconSpacer} aria-hidden='true' />
      </div>

      <div className={s.column}>
        <section className={s.hero} aria-label='App'>
          <span className={s.appIcon}>
            <Image src={getAppIcon()} alt='' width={56} height={56} />
          </span>
          <h2 className={s.appName}>{getAppTitle()}</h2>
          {APP_VERSION ? (
            <span className={s.version}>Version {APP_VERSION}</span>
          ) : null}
        </section>

        <section className={s.section} aria-label='Legal'>
          <h2 className={s.sectionLabel}>Legal</h2>
          <div className={s.card}>
            {aboutList.map(item => {
              const Icon = ROW_ICONS[item.route];
              return (
                <button
                  key={item.route}
                  type='button'
                  className={s.row}
                  onClick={() => {
                    if (item.url) {
                      window.open(item.url, '_blank', 'noopener,noreferrer');
                    } else {
                      router.push(item.route);
                    }
                  }}>
                  <span
                    className={`${s.rowIcon} ${Icon ? '' : s.rowIconLegacy}`}>
                    {Icon ? <Icon size={19} /> : item.icon}
                  </span>
                  <span className={s.rowTitle}>{item.page}</span>
                  {item.url ? (
                    <ExternalLinkIcon size={16} className={s.rowChevron} />
                  ) : (
                    <ChevronRightIcon size={17} className={s.rowChevron} />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AboutScreen;
