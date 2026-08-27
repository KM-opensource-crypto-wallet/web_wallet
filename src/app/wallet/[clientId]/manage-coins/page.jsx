'use client';
import React, {useState, useEffect, useCallback} from 'react';
import s from './ManageCoins.module.css';

const icons = require(`assets/images/icons`).default;
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ModalAddCoins from 'components/ModalAddCoins';
import ModalAddToken from 'components/ModalAddToken';
import {useSelector} from 'react-redux';

import {selectCoinsForCurrentWallet} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSelector';
import DraggableCryptoList from 'components/DraggableCryptoList';
import PageTitle from 'components/PageTitle';

import SwapVert from '@mui/icons-material/SwapVert';

const ManageCoins = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const allCoins = useSelector(selectCoinsForCurrentWallet);
  const [list, setList] = useState(Array.isArray(allCoins) ? allCoins : []);
  const [modalAddCoinsVisible, setModalAddCoinsVisible] = useState(false);

  //   const { theme } = useConp(ThemeConp);
  //   const classNames = myclassNames(theme);
  const [modalAddTokenVisible, setModalAddTokenVisible] = useState(false);
  const [isSortSelected, setIsSortSelected] = useState(false);

  useEffect(() => {
    if (Array.isArray(allCoins)) {
      setList(allCoins);
    }
  }, [allCoins]);

  const handleSearch = event => {
    let query = event.target.value;
    setSearchQuery(query);
    if (query) {
      const newList = allCoins?.filter(item => {
        return (
          item?.name?.toLowerCase()?.includes(query?.toLowerCase()) ||
          item?.symbol?.toUpperCase()?.includes(query?.toUpperCase())
        );
      });
      setList(newList);
    } else {
      setList(allCoins);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setList(allCoins);
  };

  const onPressToggle = useCallback(() => {
    setIsSortSelected(prevState => !prevState);
  }, []);

  return (
    <>
      <PageTitle
        title='Manage Coins'
        extraElement={
          searchQuery?.trim().length === 0 ? (
            <div className={s.extraElementContainer}>
              <IconButton
                aria-label='sort-toggle'
                onClick={onPressToggle}
                edge='end'
                sx={{
                  '&  .MuiSvgIcon-root': {
                    color: isSortSelected ? 'var(--background)' : 'var(--font)',
                  },
                }}>
                <SwapVert />
              </IconButton>
            </div>
          ) : null
        }
      />
      <div className={s.mainView}>
        <div className={s.searchView}>
          <TextField
            placeholder='Search'
            variant='outlined'
            id='search-bar'
            fullWidth
            value={searchQuery}
            onChange={handleSearch}
            sx={{
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
                {
                  borderColor: 'var(--gray)',
                },
              '& .MuiOutlinedInput-root': {
                border: '1px solid var(--gray)',
                borderRadius: '10px',
                marginTop: '10px',
                marginBottom: '10px',
                fontSize: '18px',
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <IconButton type='submit' aria-label='search'>
                    <SearchIcon
                      sx={{
                        color: 'gray',
                        marginRight: '10px',
                      }}
                    />
                  </IconButton>
                ),
                endAdornment: searchQuery && (
                  <IconButton
                    onClick={clearSearch}
                    size='small'
                    sx={{
                      color: 'gray',
                    }}>
                    <ClearIcon />
                  </IconButton>
                ),
              },
            }}
          />
          <DraggableCryptoList
            number={2}
            list={list}
            showSwitch
            isSortSelected={isSortSelected && searchQuery?.trim().length === 0}
          />
        </div>
        <div className={s.btnList}>
          <button
            className={s.btnAdd}
            onClick={() => setModalAddCoinsVisible(true)}>
            {icons.pluscircleo}
            <div className={s.box}>
              <p className={s.title}>Add Coin or Token</p>
              <p className={s.text}>Select from the supported list</p>
            </div>
          </button>

          {modalAddCoinsVisible && (
            <ModalAddCoins
              visible={modalAddCoinsVisible}
              hideModal={setModalAddCoinsVisible}
            />
          )}

          <button
            className={s.btnAdd}
            onClick={() => setModalAddTokenVisible(true)}>
            {icons.pluscircleo}
            <div className={s.box}>
              <p className={s.title}>Add Custom Token</p>
              <p className={s.text}>Add any ERC20/BEP20 Token</p>
            </div>
          </button>
          <ModalAddToken
            visible={modalAddTokenVisible}
            hideModal={setModalAddTokenVisible}
          />
        </div>
      </div>
    </>
  );
};

export default ManageCoins;
