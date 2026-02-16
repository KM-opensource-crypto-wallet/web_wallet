import React, {useState, useCallback, useMemo, lazy} from 'react';
import {Modal} from '@mui/material';
import Tabs from 'src/components/Tabs/Tabs';
import styles from './ModalAddCoins.module.css';

const TabAddCoins = lazy(() => import('src/components/TabAddCoins'));
const TabAddCoinsGroup = lazy(() => import('src/components/TabAddCoinsGroup'));

const ModalAddCoins = ({visible, hideModal}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loadedTabs, setLoadedTabs] = useState([0]);

  const handleClose = useCallback(() => {
    hideModal(false);
  }, [hideModal]);

  const tabList = ['Coins', 'Coins Group'];

  const tabContents = useMemo(
    () => [
      {component: TabAddCoins, key: 'coins'},
      {component: TabAddCoinsGroup, key: 'coinsGroup'},
    ],
    [],
  );

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (!loadedTabs.includes(newValue)) {
      setLoadedTabs(prevLoadedTabs => [...prevLoadedTabs, newValue]);
    }
  };

  return (
    <Modal
      open={visible}
      onClose={handleClose}
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'
      className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalDiv}>
          <div className={styles.modalHeader}>
            <p className={styles.headerText}>Add supported coin or token</p>
            <button className={styles.btnClose} onClick={handleClose}>
              ×
            </button>
          </div>
          <Tabs
            tabList={tabList}
            selectedTab={activeTab}
            onTabChange={handleTabChange}
            tabsClassName={styles.tabBar}
            tabClassName={styles.tab}
          />
          <div className={styles.contentBox}>
            {tabContents.map(({component: Component, key}, index) => (
              <div
                key={key}
                style={{
                  display: activeTab === index ? 'block' : 'none',
                  height: '100%',
                  overflow: 'auto',
                }}>
                {loadedTabs.includes(index) && (
                  <Component isVisible={activeTab === index} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ModalAddCoins;
