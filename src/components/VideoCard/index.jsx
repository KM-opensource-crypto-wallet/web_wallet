import React from 'react';
import Image from 'next/image';
import {resolveThumbnail, getYouTubeId} from 'utils/videoUtils';
import s from './VideoCard.module.css';

/**
 * Reusable video thumbnail card.
 *
 * Thumbnail resolution priority:
 *   1. item.thumbnail (API-provided)
 *   2. YouTube auto-generated: img.youtube.com/vi/{id}/hqdefault.jpg
 *   3. Direct MP4 with no thumbnail → HTML5 <video preload="metadata"> so the
 *      browser loads just enough to render the first frame as a poster.
 */
const VideoCard = ({item, onClick}) => {
  const thumbnailUrl = resolveThumbnail(item);
  const title = item.title || item.Title || 'Tutorial';
  const isDirectMp4 = !thumbnailUrl && !getYouTubeId(item?.video);

  return (
    <button className={s.card} onClick={() => onClick(item)}>
      <div className={s.thumbWrapper}>
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            sizes='(max-width: 600px) 50vw, 25vw'
            style={{objectFit: 'cover'}}
            unoptimized
          />
        ) : isDirectMp4 ? (
          /* Load just the first frame of the MP4 as thumbnail */
          <video
            className={s.videoThumb}
            src={item.video}
            preload='metadata'
            muted
            playsInline
          />
        ) : (
          <div className={s.thumbPlaceholder} />
        )}

        <div className={s.playOverlay}>
          <svg className={s.playIcon} viewBox='0 0 24 24'>
            <path
              fill='rgba(255,255,255,0.9)'
              d='M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1.5 14.5v-9l6 4.5-6 4.5z'
            />
          </svg>
        </div>
      </div>
      <p className={s.title}>{title}</p>
    </button>
  );
};

export default VideoCard;
