/**
 * Shared utilities for tutorial video handling.
 * Used by VideoCard (thumbnail resolution) and VideoPlayer (embed URL).
 */

/**
 * Extracts a YouTube video ID from any standard YouTube URL format.
 * Returns null for non-YouTube URLs (direct MP4 sources).
 */
export const getYouTubeId = url => {
  if (!url) {
    return null;
  }
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] || null;
};

/**
 * Returns the best available thumbnail URL for a video item.
 *
 * Priority:
 *   1. item.thumbnail if provided and non-empty
 *   2. YouTube auto-generated HQ thumbnail (if video is a YT link)
 *   3. null (caller should render a placeholder)
 */
export const resolveThumbnail = item => {
  if (item?.thumbnail) {
    return item.thumbnail;
  }
  const ytId = getYouTubeId(item?.video);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  return null;
};

/**
 * Returns the <iframe> src URL for a YouTube video,
 * or null for direct MP4 (rendered via <video> tag instead).
 */
export const getYouTubeEmbedSrc = video => {
  const ytId = getYouTubeId(video);
  if (ytId) {
    return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
  }
  return null;
};
