import React, {useCallback, useState} from 'react';

import {Box, Modal} from '@mui/material';
import s from './ModalSortTransactions.module.css';
import {Checkbox} from '@mui/material';

import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import {useDispatch, useSelector} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  refreshCurrentCoin,
  setPendingTransactions,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {createPendingTransactionKey} from 'dok-wallet-blockchain-networks/helper';
const ModalSortTransactions = ({
  visible,
  hideModal,
  onPressAppy,
  initialHideSmallTx,
}) => {
  const [value, setValue] = useState('Date Descending');
  const [status, setStatus] = useState('None');
  const [hideSmallTx, setHideSmallTx] = useState(initialHideSmallTx ?? false);
  const currentCoin = useSelector(selectCurrentCoin);
  const dispatch = useDispatch();

  const handleSumbit = () => {
    hideModal(false);
    onPressAppy(value, status, hideSmallTx);
  };

  const sortList = [
    {label: 'Date Ascending'},
    {label: 'Date Descending'},
    {label: 'Amount Ascending'},
    {label: 'Amount Descending'},
  ];

  const filterList = [
    {label: 'None'},
    {label: 'Send'},
    {label: 'Received'},
    {label: 'Pending'},
  ];

  //   const containerclassName = {
  //     width: ITEM_WIDTH,
  //     alignSelf: "center",
  //     backgroundColor: theme.secondaryBackgroundColor,
  //     borderRadius: 5,
  //     height: modalHeight,
  //     // padding: 2,
  //   };

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    // width: "50%",
    bgcolor: 'var(--secondaryBackgroundColor)',
    borderRadius: '10px',
    overflow: 'hidden',
    padding: '20px',
  };

  const onPressClearTransactionCache = useCallback(() => {
    hideModal(false);
    const key = createPendingTransactionKey({
      chain_name: currentCoin?.chain_name,
      symbol: currentCoin?.symbol,
      address: currentCoin?.address,
    });
    dispatch(setPendingTransactions({key, value: []}));
    dispatch(refreshCurrentCoin({fetchTransaction: true}));
  }, [
    currentCoin?.address,
    currentCoin?.chain_name,
    currentCoin?.symbol,
    dispatch,
    hideModal,
  ]);

  return (
    <Modal
      open={visible}
      onClose={() => hideModal(false)}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'>
      <Box sx={style}>
        <div className={s.section}>
          <div className={s.header}>
            <div className={s.headerBox}>
              <p className={s.title}>Sort by:</p>
              <p className={s.titleItem}>{value}</p>
            </div>

            <button className={s.btn} onClick={() => hideModal(false)}>
              <p className={s.btnTitle}>Cancel</p>
            </button>
          </div>

          {sortList?.map((item, index) => (
            <div className={s.itembox} key={index}>
              <div style={s.checkBox}>
                <Checkbox
                  checked={value === item.label}
                  onChange={() => {
                    setValue(item.label);
                  }}
                  inputProps={{'aria-label': 'controlled'}}
                  icon={<RadioButtonUncheckedIcon />}
                  checkedIcon={<RadioButtonCheckedIcon />}
                />
              </div>
              <p className={s.item}>{item.label}</p>
            </div>
          ))}

          {/* //////////////////filter/////////////////////////////////////////// */}
          <p className={s.titleItem} style={{marginVertical: 10}}>
            Filter
          </p>

          {filterList?.map((el, index) => (
            <div className={s.itembox} key={index}>
              <Checkbox
                checked={status === el.label}
                onChange={() => {
                  setStatus(el.label);
                }}
                inputProps={{'aria-label': 'controlled'}}
                icon={<RadioButtonUncheckedIcon />}
                checkedIcon={<RadioButtonCheckedIcon />}
              />
              <p className={s.item}>{el.label}</p>
            </div>
          ))}

          {/* //////////////////hide small transactions/////////////////////////////////////////// */}
          <p className={s.titleItem} style={{marginVertical: 10}}>
            Options
          </p>
          <div className={s.itembox}>
            <Checkbox
              checked={hideSmallTx}
              onChange={() => setHideSmallTx(prev => !prev)}
              inputProps={{'aria-label': 'controlled'}}
              icon={<RadioButtonUncheckedIcon />}
              checkedIcon={<RadioButtonCheckedIcon />}
            />
            <p className={s.item}>Hide transactions less than $1</p>
          </div>

          <button className={s.btnSubmit} onClick={handleSumbit}>
            <p className={s.btnSubmitTitle}>Apply</p>
          </button>
          <button
            className={s.clearCache}
            onClick={onPressClearTransactionCache}>
            <p className={s.btnClearTitle}>Clear transactions cache</p>
          </button>
        </div>
      </Box>
    </Modal>
  );
};

export default ModalSortTransactions;
