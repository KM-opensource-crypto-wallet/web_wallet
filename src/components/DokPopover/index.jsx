import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';
import {Popover} from '@mui/material';
const icons = require(`assets/images/icons`).default;
import s from './DokPopover.module.css';

// eslint-disable-next-line react/display-name
const DokPopover = forwardRef(({children, paperClassName}, ref) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const handleClick = useCallback(event => {
    setAnchorEl(event.currentTarget);
  }, []);

  useImperativeHandle(ref, () => ({
    close() {
      setAnchorEl(null);
    },
  }));

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  return (
    <>
      <button
        aria-describedby={id}
        type='button'
        onClick={handleClick}
        className={s.btn}>
        {icons.threeVerticalDot}
      </button>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          horizontal: 40,
          vertical: 35,
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={paperClassName ? {paper: {className: paperClassName}} : {}}>
        {children}
      </Popover>
    </>
  );
});

export default DokPopover;
