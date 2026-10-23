import React from 'react';
import styles from './CarouselCardsStyles.module.css';
import Illustration from './Illustrations';
import useCarousel from 'src/hooks/auth/useCarousel';
import GeneralButton from 'src/components/Button';

const CarouselCards = () => {
  const {
    data,
    index,
    isLast,
    last,
    trackStyle,
    goTo,
    handleGetStarted,
    canRestore,
    handleRestore,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
  } = useCarousel();

  return (
    <div
      className={styles.page}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}>
      <div
        className={styles.shell}
        role='region'
        aria-roledescription='carousel'
        aria-label='Welcome'>
        <div className={styles.heroPanel}>
          <div className={styles.viewport}>
            <div className={styles.track} style={trackStyle}>
              {data.map((item, i) => (
                <div
                  key={item.id}
                  className={styles.heroSlide}
                  aria-hidden={i !== index}
                  inert={i !== index}>
                  <Illustration id={item.id} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.topRow}>
            <span className={styles.counter}>
              {String(index + 1).padStart(2, '0')}
              <span className={styles.counterTotal}>
                {' '}
                / {String(data.length).padStart(2, '0')}
              </span>
            </span>
            <button
              type='button'
              onClick={() => goTo(last)}
              className={`${styles.skip} ${isLast ? styles.invisible : ''}`}
              tabIndex={isLast ? -1 : undefined}>
              Skip
            </button>
          </div>

          <div className={styles.viewport} aria-live='polite'>
            <div className={styles.track} style={trackStyle}>
              {data.map((item, i) => (
                <div
                  key={item.id}
                  className={styles.textSlide}
                  role='group'
                  aria-roledescription='slide'
                  aria-label={`${i + 1} of ${data.length}`}
                  aria-hidden={i !== index}
                  inert={i !== index}>
                  <h1 className={styles.title}>{item.title}</h1>
                  <p className={styles.body}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.dots}>
            {data.map((item, i) => (
              <button
                key={item.id}
                type='button'
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? 'step' : undefined}
                className={`${styles.dot} ${
                  i === index ? styles.activeDot : ''
                }`}
              />
            ))}
          </div>

          {canRestore && (
            <GeneralButton
              variant='secondary'
              fullWidth
              onClick={handleRestore}
              className={styles.restoreButton}>
              Restore wallets saved on this device
            </GeneralButton>
          )}

          <div className={styles.actions}>
            {index > 0 && (
              <GeneralButton
                variant='secondary'
                onClick={() => goTo(index - 1)}
                className={styles.backButton}>
                Back
              </GeneralButton>
            )}
            <GeneralButton
              onClick={isLast ? handleGetStarted : () => goTo(index + 1)}
              className={styles.nextButton}>
              {isLast ? 'Get started' : 'Next'}
            </GeneralButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarouselCards;
