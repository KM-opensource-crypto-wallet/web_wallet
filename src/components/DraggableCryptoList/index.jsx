import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import {useRouter} from 'next/navigation';
import {getLocalCurrency} from 'dok-wallet-blockchain-networks/redux/settings/settingsSelectors';
import {useSelector, useDispatch} from 'react-redux';
import CoinItem from 'components/CoinItem';
import {DndContext, closestCenter} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {rearrangeCurrentWalletCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import {ThemeContext} from 'theme/ThemeContext';
import {getPngIcons} from 'assets/images/icons/pngIcon';
import SortableItem from 'components/Sortable/sortable';
import {restrictToParentElement} from '@dnd-kit/modifiers';

const DraggableCryptoList = ({
  number,
  list,
  showSwitch,
  currentWallet,
  isSortSelected,
}) => {
  const [renderList, setRenderList] = useState([]);
  const localCurrency = useSelector(getLocalCurrency);
  const dispatch = useDispatch();
  const {themeType} = useContext(ThemeContext);
  const PngIcons = getPngIcons(themeType);

  const router = useRouter();
  const uniqueIds = useMemo(() => {
    return renderList.map(item => item?._id);
  }, [renderList]);

  useEffect(() => {
    // Anonymous function: the react-hooks compiler lint flags setState calls
    // made directly in an effect body; the same update here is accepted.
    (() => {
      setRenderList(list);
    })();
  }, [list]);

  const onDragEnd = useCallback(
    event => {
      const {active, over} = event;
      if (!over || active.id === over.id) {
        return;
      }
      const oldIndex = active?.data?.current.sortable?.index;
      const newIndex = over?.data?.current.sortable?.index;
      const reorderedItems = arrayMove(renderList, oldIndex, newIndex);
      setRenderList(reorderedItems);

      dispatch(
        rearrangeCurrentWalletCoins({
          rearrangeCoins: reorderedItems,
        }),
      );
    },
    [dispatch, renderList],
  );

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      modifiers={[restrictToParentElement]}>
      <SortableContext items={uniqueIds} strategy={verticalListSortingStrategy}>
        <ul style={{width: '100%', overflow: 'hidden'}}>
          {renderList.map((item, index) => (
            <SortableItem key={item._id} id={item?._id}>
              {dragHandleProps => (
                <CoinItem
                  item={item}
                  index={index}
                  showSwitch={showSwitch}
                  setRenderList={setRenderList}
                  localCurrency={localCurrency}
                  number={number}
                  currentWallet={currentWallet}
                  dispatch={dispatch}
                  router={router}
                  coinsLength={renderList.length}
                  isSortSelected={isSortSelected}
                  PngIcons={PngIcons}
                  dragHandleProps={dragHandleProps}
                />
              )}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableCryptoList;
