import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {useSelector, useDispatch} from 'react-redux';
import CoinItem from 'components/CoinItem';

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
