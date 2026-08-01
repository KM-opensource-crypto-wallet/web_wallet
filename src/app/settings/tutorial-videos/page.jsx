'use client';

import React, {useState, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {getTutorialVideos} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';
import GoBackButton from 'components/GoBackButton';
import VideoCard from 'components/VideoCard';
import VideoPlayer from 'components/VideoPlayer';
import s from './TutorialVideos.module.css';

const TutorialVideos = () => {
  const videos = useSelector(getTutorialVideos);
  const [activeVideo, setActiveVideo] = useState(null);

  const onClickCard = useCallback(item => setActiveVideo(item), []);
  const onClosePlayer = useCallback(() => setActiveVideo(null), []);

  return (
    <div className={s.container}>
      <GoBackButton />
      <div className={s.grid}>
        {videos.map((item, index) => (
          <div className={s.gridItem} key={`${item.video}-${index}`}>
            <VideoCard item={item} onClick={onClickCard} />
          </div>
        ))}
      </div>

      <VideoPlayer item={activeVideo} onClose={onClosePlayer} />
    </div>
  );
};

export default TutorialVideos;
