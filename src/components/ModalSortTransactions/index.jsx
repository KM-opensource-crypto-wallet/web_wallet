import React, {useCallback, useEffect, useState} from 'react';
import {Box, Modal, Switch} from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import FilterListIcon from '@mui/icons-material/FilterList';
import LayersIcon from '@mui/icons-material/Layers';
import CallMadeIcon from '@mui/icons-material/CallMade';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import s from './ModalSortTransactions.module.css';
import {useDispatch, useSelector} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  refreshCurrentCoin,
  setPendingTransactions,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {createPendingTransactionKey} from 'dok-wallet-blockchain-networks/helper';

const SORT_OPTIONS = [
  {label: 'Date Descending', Icon: ArrowDownwardIcon, desc: 'Newest first'},
  {label: 'Date Ascending', Icon: ArrowUpwardIcon, desc: 'Oldest first'},
  {
    label: 'Amount Descending',
    Icon: TrendingUpIcon,
    desc: 'Highest amount first',
  },
  {
    label: 'Amount Ascending',
    Icon: TrendingDownIcon,
    desc: 'Lowest amount first',
  },
];

const FILTER_OPTIONS = [
  {label: 'None', Icon: LayersIcon},
  {label: 'Send', Icon: CallMadeIcon},
  {label: 'Received', Icon: CallReceivedIcon},
  {label: 'Pending', Icon: AccessTimeIcon},
];

const ModalSortTransactions = ({
  visible,
  hideModal,
  onPressAppy,
  initialHideSmallTx,
  initialSort,
  initialFilter,
}) => {
  const [value, setValue] = useState(initialSort ?? 'Date Descending');
  const [status, setStatus] = useState(initialFilter ?? 'None');
  const [hideSmallTx, setHideSmallTx] = useState(initialHideSmallTx ?? true);

  useEffect(() => {
    if (visible) {
      setValue(initialSort ?? 'Date Descending');
      setStatus(initialFilter ?? 'None');
      setHideSmallTx(initialHideSmallTx ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const currentCoin = useSelector(selectCurrentCoin);
  const dispatch = useDispatch();

  const handleSubmit = () => {
    hideModal(false);
    onPressAppy(value, status, hideSmallTx);
  };

  const handleReset = () => {
    setValue('Date Descending');
    setStatus('None');
    setHideSmallTx(true);
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

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bgcolor: 'var(--secondaryBackgroundColor)',
    borderRadius: '14px',
    overflow: 'hidden',
    padding: '20px',
    width: '92%',
    maxWidth: '420px',
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  return (
    <Modal
      open={visible}
      onClose={() => hideModal(false)}
      aria-labelledby='sort-filter-modal'>
      <Box sx={style}>
        {/* Header */}
        <div className={s.header}>
          <div>
            <p className={s.headerTitle}>Sort &amp; Filter</p>
            <p className={s.headerSub}>Customise your transaction view</p>
          </div>
          <button className={s.resetBtn} onClick={handleReset}>
            <RefreshIcon style={{fontSize: 13}} />
            <span>Reset</span>
          </button>
        </div>

        {/* Sort section */}
        <div className={s.sectionLabel}>
          <SwapVertIcon style={{fontSize: 15}} />
          <span className={s.sectionLabelText}>Sort by</span>
        </div>

        <div className={s.optionGroup}>
          {SORT_OPTIONS.map((opt, index) => {
            const isSelected = value === opt.label;
            const isLast = index === SORT_OPTIONS.length - 1;
            return (
              <button
                key={opt.label}
                className={`${s.optionRow} ${isSelected ? s.optionRowSelected : ''} ${!isLast ? s.optionRowDivider : ''}`}
                onClick={() => setValue(opt.label)}>
                <div
                  className={`${s.optionIcon} ${isSelected ? s.optionIconSelected : ''}`}>
                  <opt.Icon style={{fontSize: 16}} />
                </div>
                <div className={s.optionText}>
                  <span
                    className={`${s.optionLabel} ${isSelected ? s.optionLabelSelected : ''}`}>
                    {opt.label}
                  </span>
                  <span className={s.optionDesc}>{opt.desc}</span>
                </div>
                <div
                  className={`${s.radio} ${isSelected ? s.radioSelected : ''}`}>
                  {isSelected && <div className={s.radioDot} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter section */}
        <div className={s.sectionLabel}>
          <FilterListIcon style={{fontSize: 15}} />
          <span className={s.sectionLabelText}>Filter by status</span>
        </div>

        <div className={s.filterRow}>
          {FILTER_OPTIONS.map(opt => {
            const isSelected = status === opt.label;
            return (
              <button
                key={opt.label}
                className={`${s.filterPill} ${isSelected ? s.filterPillSelected : ''}`}
                onClick={() => setStatus(opt.label)}>
                <opt.Icon style={{fontSize: 15}} />
                <span
                  className={`${s.filterPillText} ${isSelected ? s.filterPillTextSelected : ''}`}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hide small transactions */}
        <div className={s.toggleRow}>
          <div className={s.toggleLeft}>
            <div className={s.toggleIcon}>
              <VisibilityOffIcon style={{fontSize: 16}} />
            </div>
            <div>
              <p className={s.toggleLabel}>Hide small transactions</p>
              <p className={s.toggleDesc}>Skip transactions below $1</p>
            </div>
          </div>
          <Switch
            checked={hideSmallTx}
            onChange={e => setHideSmallTx(e.target.checked)}
            size='small'
          />
        </div>

        {/* Apply */}
        <button className={s.applyBtn} onClick={handleSubmit}>
          <CheckCircleOutlineIcon style={{fontSize: 18}} />
          <span className={s.applyBtnText}>Apply</span>
        </button>

        {/* Clear cache */}
        <button className={s.cacheBtn} onClick={onPressClearTransactionCache}>
          <DeleteOutlineIcon style={{fontSize: 16}} />
          <span className={s.cacheBtnText}>Clear Transaction Cache</span>
        </button>
      </Box>
    </Modal>
  );
};

export default ModalSortTransactions;
