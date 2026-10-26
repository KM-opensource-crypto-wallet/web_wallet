import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {useSelector, useDispatch} from 'react-redux';
import CoinItem from 'components/CoinItem';
import s from 'components/ModalAddCoins/ModalAddCoins.module.css';

const CryptoList = ({number, list, showSwitch, currentWallet}) => {
  const [renderList, setRenderList] = useState([]);
  const localCurrency = useSelector(getLocalCurrency);
  const dispatch = useDispatch();

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setRenderList(list);
    })();
  }, [list]);

  const router = useRouter();

  if (!renderList?.length) {
    return <p className={s.empty}>No coins found</p>;
  }

  return (
    <div>
      {renderList.map((item, index) => {
        return (
          <CoinItem
            key={`${number}_coin_item_${item?._id}`}
            item={item}
            index={index}
            showSwitch={showSwitch}
            setRenderList={setRenderList}
            localCurrency={localCurrency}
            number={number}
            currentWallet={currentWallet}
            dispatch={dispatch}
            router={router}
            coinsLength={renderList?.length}
          />
        );
      })}
    </div>
  );
};

export default CryptoList;
