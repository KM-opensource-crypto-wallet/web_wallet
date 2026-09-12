'use client';
import React, {useState, useEffect, useRef} from 'react';
import {Formik} from 'formik';
import {useDispatch, useSelector} from 'react-redux';
import {setBackedUp} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {selectAllWallets} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import GoBackButton from 'components/GoBackButton';
import styles from './Verify.module.css';
import {
  Checkbox,
  FormControlLabel,
  InputLabel,
  OutlinedInput,
  FormControl,
} from '@mui/material';
import {useParams, useRouter} from 'next/navigation';
import {cryptoRandom} from 'utils/common';

const icons = require(`assets/images/verify`).default;

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
    const random = targetWallet.phrase.split(' ').map(w => ({word: w}));
    let randomWords = [...random].sort(() => 0.5 - cryptoRandom());
    let randomNumbers = randomWords.slice(0, 3);
    let randomIds = randomNumbers.map(item => item.word);
    const tempList = random.map((value, index) => ({
      ...value,
      id: index + 1,
      random: randomIds.includes(value.word),
      audit: '',
    }));
    setList(tempList);
    const foundIndex = tempList.findIndex(item => item.random);
    setSelected(foundIndex + 1);
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
      tempItem.audit = true;
      tempList[index] = tempItem;
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
      tempItem.audit = false;
      tempList[index] = tempItem;
      setList(tempList);
    }
  };

  const selectedItem = list[selected - 1];

  if (!targetWallet?.phrase) {
    return;
  }

  return (
    <div className={styles.container}>
      <div className={styles.goBack}>
        <GoBackButton />
      </div>
      <div className={styles.section}>
        <p className={styles.title}>Your{'\n'}seed phrase</p>
        <p className={styles.textFirst}>
          Verify that you`ve stored seed phrase.
        </p>
        <p className={styles.text}>
          Enter the correct words of you seed phrase below.
        </p>
        <div className={styles.wordsList}>
          {list.map((item, index) => (
            <button
              className={styles.wordsBox}
              key={index}
              onClick={() => setSelected(item.id)}
              disabled={
                item.audit === false ? true : item.random === false && true
              }>
              {item.random === false ? (
                <>
                  <p className={styles.number}>{item.id}</p>
                </>
              ) : (
                <>
                  <p
                    className={styles.numberRandom}
                    style={{
                      borderColor: item.id === selected ? 'red' : 'transparent',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      backgroundColor:
                        item.audit === true
                          ? 'var(--background)'
                          : '#CCC8C6' && item.audit === false
                            ? '#FFF7E5'
                            : '#CCC8C6',
                      color:
                        item.audit === true
                          ? '#fff'
                          : 'var(--background)' && item.audit === false
                            ? '#FF647C'
                            : 'var(--background)',
                    }}>
                    {item.id}
                  </p>
                </>
              )}
              {item.random === true && (
                <>
                  {item.audit === '' && (
                    <div className={styles.icon}>{icons.сastle}</div>
                  )}

                  {item.audit === false && (
                    <div className={styles.cross}>{icons.cross}</div>
                  )}

                  {item.audit === true && (
                    <div className={styles.check}>{icons.check}</div>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.formInput}>
        <p className={styles.info}>
          {`Enter the ${selected}${
            selected === 1
              ? 'st'
              : selected === 2
                ? 'nd'
                : selected === 3
                  ? 'rd'
                  : 'th'
          } word`}
        </p>
        <Formik
          innerRef={formikRef}
          initialValues={{word: ''}}
          onSubmit={handleSubmit}>
          {({handleChange, handleBlur, handleSubmit, values}) => (
            <form onSubmit={handleSubmit} className={styles.formList}>
              <FormControl variant='outlined'>
                <InputLabel
                  sx={{
                    color:
                      selectedItem?.audit === false
                        ? 'red'
                        : 'var(--borderActiveColor)',
                  }}
                  focused={false}>
                  Enter word here
                </InputLabel>
                <OutlinedInput
                  editable={textInputEnabled}
                  fullWidth
                  id='word'
                  name='word'
                  onChange={handleChange('word')}
                  onBlur={handleBlur('word')}
                  value={values.word}
                  label='Enter word here'
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        selectedItem?.audit === false
                          ? 'red'
                          : textInputEnabled
                            ? 'var(--borderActiveColor)'
                            : 'var(--headerBorder)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor:
                        selectedItem?.audit === false
                          ? 'red'
                          : 'var(--borderActiveColor)',
                    },
                    '& .MuiInputLabel-outlined': {
                      color:
                        selectedItem?.audit === false
                          ? 'red'
                          : 'var(--sidebarIcon)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'var(--sidebarIcon) !important',
                    },
                  }}
                />
              </FormControl>
              {selectedItem?.audit === false && (
                <p className={styles.textConfirm}>Invalid mnemonic word.</p>
              )}
              <div className={styles.checkbox}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => {
                        setChecked(!checked);
                      }}
                    />
                  }
                />

                <p className={styles.checkText}>
                  I acknowledge that I must safely store me seed phrase as I
                  wiil not be able to access my funds
                </p>
              </div>
              <button
                type='submit'
                disabled={!checked}
                className={styles.btn}
                style={{
                  backgroundColor: checked ? 'var(--background)' : '#708090',
                }}
                // onPress={() =>
                //   verify === true
                //     ? navigation.navigate("Create")
                //     : handleSubmit()
                // }
                // onPress={handleSubmit}
              >
                Confirm
              </button>
            </form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default Verify;
