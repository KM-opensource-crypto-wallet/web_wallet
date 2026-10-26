import React, {useCallback, useEffect, useState} from 'react';
import s from './ModalSortTransactions.module.css';
import {useDispatch, useSelector} from 'react-redux';
import {selectCurrentCoin} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import {
  refreshCurrentCoin,
  setPendingTransactions,
} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {createPendingTransactionKey} from 'dok-wallet-blockchain-networks/helper';
import HomeSheet from 'components/Home/HomeSheet';
import GeneralButton from 'components/Button';
import {CheckIcon} from 'components/Home/HomeIcons';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  EyeOffIcon,
  ListIcon,
  ResetIcon,
  TrashIcon,
  TrendDownIcon,
  TrendUpIcon,
} from 'components/Transactions/TxIcons';

// `label` is the stored value (kept as-is for the page's sorting); `title`
// is what the sheet and the page's sort bar show.
export const SORT_OPTIONS = [
  {
    label: 'Date Descending',
    title: 'Date descending',
    Icon: ArrowDownIcon,
    desc: 'Newest first',
  },
  {
    label: 'Date Ascending',
    title: 'Date ascending',
    Icon: ArrowUpIcon,
    desc: 'Oldest first',
  },
  {
    label: 'Amount Descending',
    title: 'Amount descending',
    Icon: TrendUpIcon,
    desc: 'Highest amount first',
  },
  {
    label: 'Amount Ascending',
    title: 'Amount ascending',
    Icon: TrendDownIcon,
    desc: 'Lowest amount first',
  },
];

const FILTER_OPTIONS = [
  {label: 'None', title: 'All', Icon: ListIcon},
  {label: 'Send', title: 'Sent', Icon: ArrowUpIcon},
  {label: 'Received', title: 'Received', Icon: ArrowDownIcon},
  {label: 'Pending', title: 'Pending', Icon: ClockIcon},
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
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      if (visible) {
        setValue(initialSort ?? 'Date Descending');
        setStatus(initialFilter ?? 'None');
        setHideSmallTx(initialHideSmallTx ?? true);
      }
    })();
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

  return (
    <HomeSheet
      visible={visible}
      onClose={() => hideModal(false)}
      title='Sort & filter'
      labelId='sort-filter-title'>
      <div className={s.body}>
        <div className={s.intro}>
          <p className={s.introText}>Customise your transaction view</p>
          <GeneralButton
            variant='unstyled'
            className={s.resetButton}
            onClick={handleReset}>
            <ResetIcon size={14} />
            Reset
          </GeneralButton>
        </div>

        <div>
          <p className={s.sectionLabel}>Sort by</p>
          <div className={s.optionGroup} role='radiogroup' aria-label='Sort by'>
            {SORT_OPTIONS.map(opt => {
              const isSelected = value === opt.label;
              return (
                <button
                  key={opt.label}
                  type='button'
                  role='radio'
                  aria-checked={isSelected}
                  className={`${s.optionRow} ${
                    isSelected ? s.optionRowSelected : ''
                  }`}
                  onClick={() => setValue(opt.label)}>
                  <span className={s.optionIcon}>
                    <opt.Icon size={17} />
                  </span>
                  <span className={s.optionText}>
                    <span className={s.optionLabel}>{opt.title}</span>
                    <span className={s.optionDesc}>{opt.desc}</span>
                  </span>
                  <span className={s.radio}>
                    {isSelected ? <span className={s.radioDot} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={s.sectionLabel}>Direction</p>
          <div className={s.pills} role='radiogroup' aria-label='Direction'>
            {FILTER_OPTIONS.map(opt => {
              const isSelected = status === opt.label;
              return (
                <button
                  key={opt.label}
                  type='button'
                  role='radio'
                  aria-checked={isSelected}
                  className={`${s.pill} ${isSelected ? s.pillSelected : ''}`}
                  onClick={() => setStatus(opt.label)}>
                  <opt.Icon size={15} />
                  {opt.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className={s.toggleRow}>
          <span className={s.toggleIcon}>
            <EyeOffIcon size={17} />
          </span>
          <span className={s.optionText}>
            <span className={s.optionLabel}>Hide small transactions</span>
            <span className={s.optionDesc}>Skip transfers under $1</span>
          </span>
          <button
            type='button'
            role='switch'
            aria-checked={hideSmallTx}
            aria-label='Hide small transactions'
            className={`${s.switch} ${hideSmallTx ? s.switchOn : ''}`}
            onClick={() => setHideSmallTx(v => !v)}>
            <span className={s.switchThumb} />
          </button>
        </div>

        <GeneralButton fullWidth className={s.apply} onClick={handleSubmit}>
          <CheckIcon size={18} />
          Apply
        </GeneralButton>
        <GeneralButton
          variant='unstyled'
          className={s.clearCache}
          onClick={onPressClearTransactionCache}>
          <TrashIcon size={15} />
          Clear cached history
        </GeneralButton>
      </div>
    </HomeSheet>
  );
};

export default ModalSortTransactions;
