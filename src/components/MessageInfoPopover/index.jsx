import React, {useRef, useState} from 'react';
import s from './MesageInfoPopOver.module.css';
import DokPopover from 'components/DokPopover';
import ModalInfo from 'components/ModalInfo';
import {TABS_INFO} from 'dok-wallet-blockchain-networks/helper';

const MessageInfoPopOver = () => {
  const popoverRef = useRef('');
  // Rendered into ModalInfo, so it is state rather than a ref.
  const [selectedInfo, setSelectedInfo] = useState();
  const [modalInfoPopupVisible, setModalInfoPopupVisible] = useState(false);

  return (
    <>
      <DokPopover ref={popoverRef}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
          <button
            className={s.popoverItemView}
            onClick={() => {
              setSelectedInfo('MESSAGES');
              setModalInfoPopupVisible(true);
            }}>
            <p className={s.popoverItemText}>{'What is Messages?'}</p>
          </button>
          <button
            className={s.popoverItemView}
            onClick={() => {
              setSelectedInfo('REQUESTS');
              setModalInfoPopupVisible(true);
            }}>
            <p className={s.popoverItemText}>{'What is Requests?'}</p>
          </button>
        </div>
      </DokPopover>
      <ModalInfo
        visible={modalInfoPopupVisible}
        handleClose={() => {
          setModalInfoPopupVisible(false);
        }}
        title={TABS_INFO[selectedInfo]?.title}
        message={TABS_INFO[selectedInfo]?.message}
      />
    </>
  );
};

export default MessageInfoPopOver;
