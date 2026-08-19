'use client';

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Box, Modal} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import s from './CoinSelectorSheet.module.css';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '95%',
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  bgcolor: 'var(--secondaryBackgroundColor)',
  borderRadius: '10px',
  '@media (min-width: 768px)': {
    width: '50%',
    maxWidth: '560px',
  },
  overflow: 'hidden',
};

// Searchable coin picker, shared by the from- and to-side of the swap:
// present(direction) remembers which side asked, and onSelect receives it
// back along with the picked option.
const CoinSelectorSheet = forwardRef(({options, onSelect}, ref) => {
  const directionRef = useRef('from');
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  useImperativeHandle(
    ref,
    () => ({
      present: direction => {
        directionRef.current = direction || 'from';
        setSearchText('');
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [],
  );

  const data = useMemo(() => {
    if (!searchText) {
      return options || [];
    }
    const needle = searchText.toLowerCase();
    return (options || []).filter(
      item =>
        item?.options?.symbol?.toLowerCase()?.includes(needle) ||
        item?.options?.title?.toLowerCase()?.includes(needle) ||
        item?.options?.chain_display_name?.toLowerCase()?.includes(needle),
    );
  }, [options, searchText]);

  const onPressItem = useCallback(
    item => {
      setIsOpen(false);
      onSelect?.(item, directionRef.current);
    },
    [onSelect],
  );

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <Box sx={modalStyle}>
        <div className={s.container}>
          <p className={s.title}>Select coin</p>
          <div className={s.searchBox}>
            <SearchIcon sx={{fontSize: 20, color: 'var(--gray)'}} />
            <input
              className={s.searchInput}
              placeholder='Search by name or symbol'
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              autoFocus={true}
            />
          </div>
          <div className={s.list}>
            {data.length ? (
              data.map(item => (
                <button
                  type='button'
                  key={item?.value}
                  className={s.optionRow}
                  onClick={() => onPressItem(item)}>
                  <div className={s.optionIconBox}>
                    {!!item?.options?.icon && (
                      <img
                        src={item.options.icon}
                        alt=''
                        className={s.optionIcon}
                      />
                    )}
                  </div>
                  <div className={s.optionLabelBox}>
                    <p className={s.optionTitle}>
                      {item?.options?.title || item?.label}
                    </p>
                    {!!item?.options?.chain_display_name && (
                      <p className={s.optionChain}>
                        {item.options.chain_display_name}
                      </p>
                    )}
                  </div>
                  <p className={s.optionSymbol}>
                    {item?.options?.symbol?.toUpperCase()}
                  </p>
                </button>
              ))
            ) : (
              <p className={s.emptyText}>
                No coins match your search. Add more coins from your wallet to
                swap them.
              </p>
            )}
          </div>
        </div>
      </Box>
    </Modal>
  );
});

CoinSelectorSheet.displayName = 'CoinSelectorSheet';

export default CoinSelectorSheet;
