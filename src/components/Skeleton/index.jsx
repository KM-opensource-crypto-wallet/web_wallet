import React from 'react';
import s from './Skeleton.module.css';

// Placeholder bar shown while `loading`; renders `children` once loaded.
// The bar takes the parent's font size, so it lines up with the text it
// stands in for. `width` is any CSS length; it defaults to the element's.
const Skeleton = ({loading, width, height, className, children}) => {
  if (!loading) {
    return children ?? null;
  }
  return (
    <span
      className={`${s.skeleton} ${className || ''}`}
      style={{width, height}}
      aria-busy='true'
      aria-label='Loading'
    />
  );
};

export default Skeleton;
