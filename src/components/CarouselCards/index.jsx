import React, {useContext, useEffect, useState} from 'react';
import data from 'data/carousel';
import styles from './CarouselCardsStyles.module.css';
import {Carousel} from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import {useRouter, useSearchParams} from 'next/navigation';
import {useDispatch, useSelector} from 'react-redux';
import {getHasAccount} from 'dok-wallet-blockchain-networks/redux/auth/authSelectors';
import Image from 'next/image';
import {getAppAssets} from 'whitelabel/whiteLabelInfo';
import {ThemeContext} from 'theme/ThemeContext';
import {canRestoreFromVault} from 'security/vaultRecovery';

const CarouselCards = () => {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const storePassword = useSelector(getHasAccount);
  const {themeType} = useContext(ThemeContext);
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  // Keys from earlier are still in this browser (vault without an account).
  const [canRestore, setCanRestore] = useState(false);

  useEffect(() => {
    dispatch(canRestoreFromVault())
      .then(setCanRestore)
      .catch(() => setCanRestore(false));
  }, [dispatch]);

  return (
    <div className={styles.container}>
      {canRestore && (
        <div className={styles.section}>
          <button
            className={`${styles.button} ${styles.restoreButton}`}
            onClick={() =>
              router.push(
                `/auth/restore-from-device${
                  searchParams ? `?${searchParams}` : ''
                }`,
              )
            }>
            Restore wallets saved on this device
          </button>
        </div>
      )}
      <Carousel
        showIndicators={false}
        showThumbs={false}
        selectedItem={index}
        showArrows={true}
        onChange={setIndex}
        emulateTouch={true}
        className={styles.carouselSection}>
        {data.map((item, index) => (
          <div className={styles.carouselList} key={index}>
            <div className={styles.box}>
              {getAppAssets()?.[`onboarding_${index + 1}`]?.[themeType] ? (
                <Image
                  src={getAppAssets()?.[`onboarding_${index + 1}`]?.[themeType]}
                  width={200}
                  height={200}
                  alt={item.title}
                />
              ) : (
                item.src
              )}
            </div>
            <div className={styles.header}>
              <p className={styles.title}>{item.title}</p>
              <p className={styles.body}>{item.body}</p>
            </div>
          </div>
        ))}
      </Carousel>

      <div className={index === 3 ? styles.hidden : styles.paginationContainer}>
        <button onClick={() => setIndex(3)} className={styles.btn}>
          Skip
        </button>

        <div className={styles.paginationDotsContainer}>
          {[0, 1, 2, 3].map(item => (
            <div
              key={item}
              className={`${styles.paginationDot} ${
                index === item ? styles.activeDot : styles.inactiveDot
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setIndex(index + 1)}
          disabled={index === 3}
          className={styles.btn}>
          Next
        </button>
      </div>

      {index === 3 && (
        <div className={styles.section}>
          <button
            className={styles.button}
            onClick={() => {
              const searchParamsStr = `${
                searchParams ? `?${searchParams}` : ''
              }`;

              if (storePassword) {
                router.push(`/auth/login${searchParamsStr}`);
              } else {
                router.push(`/auth/registration${searchParamsStr}`);
              }
            }}>
            Get Started
          </button>
        </div>
      )}
    </div>
  );
};

export default CarouselCards;
