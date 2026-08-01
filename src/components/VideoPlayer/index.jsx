import React, {useEffect, useCallback} from 'react';
import {getYouTubeEmbedSrc} from 'utils/videoUtils';
import s from './VideoPlayer.module.css';

/**
 * Full-screen overlay video player.
 * - YouTube  → sandboxed <iframe> embed
 * - Direct MP4 → <video> element
 * - Portrait videos use a narrower container; horizontal videos use full width.
 */
const VideoPlayer = ({item, onClose}) => {
  const handleKeyDown = useCallback(
    e => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!item) {
      return;
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [item, handleKeyDown]);

  if (!item) {
    return null;
  }

  const isPortrait = item.orientation === 'portrait';
  const embedSrc = getYouTubeEmbedSrc(item.video);

  return (
    <div className={s.backdrop} onClick={onClose} role='dialog' aria-modal>
      {/* Stop click propagation so clicking inside the player doesn't close it */}
      <div
        className={`${s.playerWrapper} ${isPortrait ? s.portrait : s.landscape}`}
        onClick={e => e.stopPropagation()}>
        <button className={s.closeButton} onClick={onClose} aria-label='Close'>
          ✕
        </button>

        {embedSrc ? (
          <iframe
            className={s.iframe}
            src={embedSrc}
            title={item.title || item.Title || 'Tutorial'}
            allow='autoplay; fullscreen; picture-in-picture; encrypted-media'
            allowFullScreen
            frameBorder='0'
          />
        ) : (
          <video
            className={s.videoEl}
            src={item.video}
            controls
            autoPlay
            playsInline
          />
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
