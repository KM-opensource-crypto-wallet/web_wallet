import React, {useState, useCallback, lazy, Suspense} from 'react';
import HomeSheet from 'components/Home/HomeSheet';
import Loading from 'components/Loading';
import s from './ModalAddCoins.module.css';

const TabAddCoins = lazy(() => import('src/components/TabAddCoins'));
const TabAddCoinsGroup = lazy(() => import('src/components/TabAddCoinsGroup'));

const TABS = [
  {label: 'Coins', Component: TabAddCoins},
  {label: 'Coin groups', Component: TabAddCoinsGroup},
];

// "Add coin or token": the supported catalog, as single coins or groups.
// Each tab mounts on first visit and stays mounted so its list and scroll
// position survive switching back.
const ModalAddCoins = ({visible, hideModal}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loadedTabs, setLoadedTabs] = useState([0]);

  const handleClose = useCallback(() => {
    hideModal(false);
  }, [hideModal]);

  const selectTab = index => {
    setActiveTab(index);
    if (!loadedTabs.includes(index)) {
      setLoadedTabs(prev => [...prev, index]);
    }
  };

  return (
    <HomeSheet
      visible={visible}
      onClose={handleClose}
      title='Add coin or token'
      labelId='add-coins-title'
      className={s.sheet}>
      <div className={s.segmented} role='tablist' aria-label='Add'>
        {TABS.map(({label}, index) => (
          <button
            key={label}
            type='button'
            role='tab'
            aria-selected={activeTab === index}
            className={`${s.segment} ${
              activeTab === index ? s.segmentActive : ''
            }`}
            onClick={() => selectTab(index)}>
            {label}
          </button>
        ))}
      </div>
      <div className={s.body}>
        {TABS.map(({label, Component}, index) => (
          <div
            key={label}
            role='tabpanel'
            className={s.panel}
            hidden={activeTab !== index}>
            {loadedTabs.includes(index) && (
              <Suspense
                fallback={
                  <div className={s.loader}>
                    <Loading />
                  </div>
                }>
                <Component isVisible={activeTab === index} />
              </Suspense>
            )}
          </div>
        ))}
      </div>
    </HomeSheet>
  );
};

export default ModalAddCoins;
