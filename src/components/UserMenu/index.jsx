import React, {useState} from 'react';
import {Menu, MenuItem, Divider, IconButton, Avatar} from '@mui/material';
import {Logout, AccountCircle} from '@mui/icons-material';
import s from './UserMenu.module.css';

const UserMenu = ({user, onLogout}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = event => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size='small'
        aria-controls={open ? 'account-menu' : undefined}
        aria-haspopup='true'
        aria-expanded={open ? 'true' : undefined}
        className={s.triggerButton}>
        <AccountCircle sx={{width: 32, height: 32, color: 'var(--gray)'}} />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        id='account-menu'
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'hidden',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            backgroundColor: 'var(--backgroundColor)', // Match theme
            color: 'var(--font-color)',
            border: '1px solid var(--whiteOutline)',
            borderRadius: '12px',
            minWidth: '200px',
          },
        }}
        transformOrigin={{horizontal: 'right', vertical: 'top'}}
        anchorOrigin={{horizontal: 'right', vertical: 'bottom'}}>
        <div className={s.userInfoSection}>
          {user?.image ? (
            <img src={user.image} alt='Profile' className={s.userAvatar} />
          ) : (
            <AccountCircle
              sx={{width: 40, height: 40, color: 'var(--font-color)'}}
            />
          )}
          <div className={s.userInfoDetails}>
            <p className={s.userName}>{user?.name || 'User'}</p>
            <p className={s.userEmail}>{user?.email || ''}</p>
          </div>
        </div>

        <Divider sx={{my: 0.5, borderColor: 'var(--whiteOutline)'}} />

        <MenuItem onClick={handleLogout} className={s.menuOption}>
          <Logout fontSize='small' className={s.icon} />
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;
