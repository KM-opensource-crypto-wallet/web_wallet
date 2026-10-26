'use client';

import React, {useState, useCallback} from 'react';
import {useSelector} from 'react-redux';
import Image from 'next/image';
import {getTutorialVideos} from 'dok-wallet-blockchain-networks/redux/cryptoProviders/cryptoProvidersSelectors';
import VideoPlayer from 'components/VideoPlayer';
import Screen from 'components/Screen';
import {PlayIcon} from 'app/settings/SettingsIcons';
import {resolveThumbnail, getYouTubeId} from 'utils/videoUtils';
import s from './TutorialVideos.module.css';

// Thumbnail card; resolves the poster the same way as components/VideoCard
// (API thumbnail, then YouTube's, then the first frame of a direct MP4).
const VideoTile = ({item, onClick}) => {
  const thumbnailUrl = resolveThumbnail(item);
  const title = item.title || item.Title || 'Tutorial';
  const isDirectMp4 = !thumbnailUrl && !getYouTubeId(item?.video);

  return (
    <button type='button' className={s.tile} onClick={() => onClick(item)}>
      <span className={s.thumb}>
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=''
            fill
            sizes='(max-width: 600px) 50vw, 300px'
            style={{objectFit: 'cover'}}
            unoptimized
          />
        ) : isDirectMp4 ? (
          <video
            className={s.thumbVideo}
            src={item.video}
            preload='metadata'
            muted
            playsInline
          />
        ) : null}
        <span className={s.playBadge} aria-hidden='true'>
          <svg width='16' height='16' viewBox='0 0 24 24'>
            <path d='M8 5.5v13l10.5-6.5z' />
          </svg>
        </span>
      </span>
      <span className={s.tileTitle}>{title}</span>
    </button>
  );
};

const TutorialVideos = () => {
  const videos = useSelector(getTutorialVideos);
  const [activeVideo, setActiveVideo] = useState(null);

  const onClickCard = useCallback(item => setActiveVideo(item), []);
  const onClosePlayer = useCallback(() => setActiveVideo(null), []);

  return (
    <Screen className={s.page} title='Tutorial Videos'>
      <div className={s.column}>
        <p className={s.lead}>Learn how to use wallet features.</p>
        {videos?.length ? (
          <ul className={s.grid}>
            {videos.map((item, index) => (
              <li className={s.gridItem} key={`${item.video}-${index}`}>
                <VideoTile item={item} onClick={onClickCard} />
              </li>
            ))}
          </ul>
        ) : (
          <div className={s.empty}>
            <span className={s.emptyIcon}>
              <PlayIcon size={22} />
            </span>
            <p className={s.emptyText}>No tutorial videos yet.</p>
          </div>
        )}
      </div>

      <VideoPlayer item={activeVideo} onClose={onClosePlayer} />
    </Screen>
  );
};

export default TutorialVideos;
