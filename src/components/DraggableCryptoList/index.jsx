import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {useDispatch} from 'react-redux';
import {DndContext, closestCenter} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {rearrangeCurrentWalletCoins} from 'dok-wallet-blockchain-networks/redux/wallets/walletsSlice';
import SortableItem from 'components/Sortable/sortable';
import {restrictToParentElement} from '@dnd-kit/modifiers';
import ManageCoinRow from './ManageCoinRow';
import s from './DraggableCryptoList.module.css';

// Manage coins list: show/hide switches, and drag or up/down reordering
// while `isSortSelected` is on.
const DraggableCryptoList = ({list, isSortSelected}) => {
  const [renderList, setRenderList] = useState([]);
  const dispatch = useDispatch();

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
        <ul className={s.list}>
          {renderList.map((item, index) => (
            <SortableItem key={item._id} id={item?._id}>
              {dragHandleProps => (
                <ManageCoinRow
                  item={item}
                  index={index}
                  coinsLength={renderList.length}
                  dispatch={dispatch}
                  router={router}
                  setRenderList={setRenderList}
                  isSortSelected={isSortSelected}
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
