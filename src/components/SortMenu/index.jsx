'use client';
import React, {useEffect, useRef} from 'react';
import s from './SortMenu.module.css';

const SortMenu = ({
  visible,
  onClose,
  onSelect,
  currentSort,
  anchorRef,
  sortOptions,
  title = 'Sort',
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const handleClickOutside = e => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible, onClose, anchorRef]);

  if (!visible) {
    return null;
  }

  const handleSelect = option => {
    onSelect(option);
    onClose();
  };

  return (
    <>
      <div className={s.backdrop} onClick={onClose} />
      <div className={s.container} ref={menuRef}>
        <div className={s.menu}>
          <div className={s.title}>{title}</div>
          {sortOptions.map((option, index) => (
            <React.Fragment key={option.value}>
              {index > 0 && option.showDivider && <div className={s.divider} />}
              <button
                className={`${s.menuItem} ${currentSort === option.value ? s.menuItemActive : ''}`}
                onClick={() => handleSelect(option.value)}>
                <span
                  className={`${s.menuItemText} ${currentSort === option.value ? s.menuItemTextActive : ''}`}>
                  {option.label}
                </span>
              </button>
              {option.showDivider && index < sortOptions.length - 1 && (
                <div className={s.divider} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

export default SortMenu;
