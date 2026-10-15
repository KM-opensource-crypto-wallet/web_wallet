// `next/image` for the extension: a plain <img>. Accepts the same `src`
// shapes (URL string or a static import with `.src`) and drops the
// optimisation-only props.
import React, {forwardRef} from 'react';

const Image = forwardRef(function Image(
  {
    src,
    fill,
    priority,
    quality,
    placeholder,
    blurDataURL,
    loader,
    unoptimized,
    overrideSrc,
    onLoadingComplete,
    style,
    loading,
    ...rest
  },
  ref,
) {
  const url = typeof src === 'object' && src !== null ? src.src : src;
  const fillStyle = fill
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }
    : null;
  return (
    // This IS the next/image replacement; `alt` arrives in `rest` like any
    // other prop the caller passes.
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      ref={ref}
      src={url}
      loading={priority ? 'eager' : loading || 'lazy'}
      decoding='async'
      style={fillStyle ? {...fillStyle, ...style} : style}
      onLoad={event => {
        rest.onLoad?.(event);
        onLoadingComplete?.(event.currentTarget);
      }}
      {...rest}
    />
  );
});

export default Image;
export const getImageProps = props => ({props});
