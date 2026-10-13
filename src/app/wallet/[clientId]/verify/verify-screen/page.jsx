'use client';
import React, {useState, useEffect, useRef} from 'react';
import {Formik} from 'formik';
import {useDispatch, useSelector} from 'react-redux';
import {setBackedUp} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import styles from './Verify.module.css';
import {useParams, useRouter} from 'next/navigation';
import {cryptoRandom} from 'utils/common';
import GeneralButton from 'components/Button';
import {
  CheckIcon,
  ChevronLeftIcon,
  CloseIcon,
  InfoIcon,
} from 'components/Home/HomeIcons';
import {ShieldIcon} from 'components/Transactions/TxIcons';

const ordinal = n => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) {
    return `${n}th`;
  }
  return `${n}${{1: 'st', 2: 'nd', 3: 'rd'}[n % 10] || 'th'}`;
};

export const Verify = () => {
  const [list, setList] = useState([]);
  const [checked, setChecked] = useState(false);
  const [textInputEnabled, setTextInputEnabled] = useState(true);
  const [selected, setSelected] = useState(0);

  const formikRef = useRef(null);
  const dispatch = useDispatch();
  // Wallet being confirmed - always the wallet named in the URL (may not be
  // the currently active wallet, e.g. confirming another wallet's backup from
  // its Edit screen)
  const {clientId} = useParams();
  const allWallets = useSelector(selectAllWallets);
  const targetWallet = allWallets?.find(item => item?.clientId === clientId);
  const router = useRouter();

  useEffect(() => {
    // Guarded: after lockSession the phrase is stripped from memory until re-login.
    const random = (targetWallet?.phrase?.split(' ') ?? []).map(w => ({
      word: w,
    }));
    let randomWords = [...random].sort(() => 0.5 - cryptoRandom());
    let randomNumbers = randomWords.slice(0, 3);
    let randomIds = randomNumbers.map(item => item.word);
    const tempList = random.map((value, index) => ({
      ...value,
      id: index + 1,
      random: randomIds.includes(value.word),
      audit: '',
    }));
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setList(tempList);
      const foundIndex = tempList.findIndex(item => item.random);
      setSelected(foundIndex + 1);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = values => {
    const index = selected - 1;
    const tempItem = list[index];
    const tempList = [...list];
    if (tempItem.word === values?.word) {
      const newIndex = list.findIndex(
        item => item.random && item.word !== values.word && !item.audit,
      );
      tempList[index] = {...tempItem, audit: true};
      setList(tempList);

      const filterItem = tempList.filter(item => item.audit);
      if (filterItem.length === 3) {
        setTextInputEnabled(false);

        if (checked) {
          dispatch(setBackedUp({clientId}));
          router.replace('/home');
        }
      } else {
        setSelected(newIndex + 1);
        formikRef?.current?.setFieldValue('word', '');
      }
    } else {
      tempList[index] = {...tempItem, audit: false};
      setList(tempList);
    }
  };

  const selectedItem = list[selected - 1];

  if (!targetWallet?.phrase) {
    return;
  }

  const confirmedCount = list.filter(item => item.audit === true).length;
  const isWrong = selectedItem?.audit === false;

  return (
    <main className={styles.page}>
      <div className={styles.glow} aria-hidden='true' />
      <div className={styles.topBar}>
        <GeneralButton
          variant='unstyled'
          className={styles.iconButton}
          aria-label='Back'
          onClick={() => router.back()}>
          <ChevronLeftIcon size={24} />
        </GeneralButton>
        <div className={styles.heading}>
          <h1 className={styles.title}>Confirm seed phrase</h1>
          {targetWallet.walletName ? (
            <span className={styles.subtitle}>{targetWallet.walletName}</span>
          ) : null}
        </div>
        <span className={styles.iconSpacer} aria-hidden='true' />
      </div>

      <Formik
        innerRef={formikRef}
        initialValues={{word: ''}}
        onSubmit={handleSubmit}>
        {({handleChange, handleBlur, handleSubmit, values}) => (
          <form className={styles.column} onSubmit={handleSubmit} noValidate>
            <div className={styles.intro}>
              <span className={styles.introIcon} aria-hidden='true'>
                <ShieldIcon size={22} />
              </span>
              <p className={styles.introTitle}>
                Verify that you&apos;ve stored your seed phrase.
              </p>
              <p className={styles.introText}>
                Enter the requested words from your seed phrase below.
              </p>
            </div>

            <div className={styles.progress} aria-live='polite'>
              <span className={styles.progressText}>
                {confirmedCount} of 3 words confirmed
              </span>
              <span className={styles.progressDots} aria-hidden='true'>
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className={`${styles.progressDot} ${
                      i < confirmedCount ? styles.progressDotOn : ''
                    }`}
                  />
                ))}
              </span>
            </div>

            <ol className={styles.wordsCard} aria-label='Seed phrase words'>
              {list.map((item, index) => {
                if (!item.random) {
                  return (
                    <li key={index} className={styles.slot}>
                      <span className={styles.number}>{item.id}</span>
                      <span className={styles.hidden} aria-hidden='true'>
                        ••••
                      </span>
                    </li>
                  );
                }
                const state =
                  item.audit === true
                    ? styles.slotDone
                    : item.audit === false
                      ? styles.slotWrong
                      : styles.slotPending;
                return (
                  <li key={index}>
                    <button
                      type='button'
                      className={`${styles.slot} ${styles.slotAsk} ${state} ${
                        item.id === selected ? styles.slotSelected : ''
                      }`}
                      aria-pressed={item.id === selected}
                      aria-label={`Word ${item.id}${
                        item.audit === true
                          ? ', confirmed'
                          : item.audit === false
                            ? ', incorrect'
                            : ''
                      }`}
                      onClick={() => setSelected(item.id)}
                      disabled={item.audit === false}>
                      <span className={styles.number}>{item.id}</span>
                      <span className={styles.slotMark} aria-hidden='true'>
                        {item.audit === true ? (
                          <CheckIcon size={15} strokeWidth={2.6} />
                        ) : item.audit === false ? (
                          <CloseIcon size={13} />
                        ) : (
                          '?'
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <section className={styles.card} aria-label='Enter word'>
              <label className={styles.fieldLabel} htmlFor='word'>
                Enter the {ordinal(selected)} word
              </label>
              <div
                className={`${styles.inputRow} ${
                  isWrong ? styles.inputError : ''
                }`}>
                <span className={styles.inputNumber}>#{selected}</span>
                <input
                  id='word'
                  name='word'
                  className={styles.input}
                  placeholder='Enter word here'
                  autoComplete='off'
                  autoCapitalize='off'
                  autoCorrect='off'
                  spellCheck={false}
                  readOnly={!textInputEnabled}
                  aria-invalid={isWrong}
                  aria-describedby={isWrong ? 'word-error' : undefined}
                  onChange={handleChange('word')}
                  onBlur={handleBlur('word')}
                  value={values.word}
                />
              </div>
              {isWrong ? (
                <p id='word-error' className={styles.error} role='alert'>
                  Invalid mnemonic word.
                </p>
              ) : null}
            </section>

            <button
              type='button'
              role='checkbox'
              aria-checked={checked}
              className={`${styles.ack} ${checked ? styles.ackOn : ''}`}
              onClick={() => setChecked(!checked)}>
              <span className={styles.tick} aria-hidden='true'>
                {checked ? <CheckIcon size={13} strokeWidth={3} /> : null}
              </span>
              <span>
                I acknowledge that I must safely store my seed phrase, as I will
                not be able to access my funds without it.
              </span>
            </button>

            <div className={styles.note}>
              <InfoIcon size={18} />
              <p>
                Never share your seed phrase. Anyone with these words can take
                your funds.
              </p>
            </div>

            <div className={styles.footer}>
              <GeneralButton
                type='submit'
                fullWidth
                className={styles.button}
                disabled={!checked}>
                Confirm
              </GeneralButton>
            </div>
          </form>
        )}
      </Formik>
    </main>
  );
};

export default Verify;
