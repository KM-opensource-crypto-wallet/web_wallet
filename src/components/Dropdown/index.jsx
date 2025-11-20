import s from './Dropdown.module.css';

import {
  Autocomplete,
  Select as BaseSelect,
  FormControl,
  MenuItem,
  TextField,
  Popper,
} from '@mui/material';

const NewIcon = props => (
  <svg
    {...props}
    viewBox='0 0 1024 1024'
    version='1.1'
    xmlns='http://www.w3.org/2000/svg'>
    <path d='M366.293333 702.293333l195.626667-195.626666-195.626667-195.626667L426.666667 250.666667l256 256-256 256z' />
  </svg>
);

const Dropdown = ({
  listData,
  onValueChange,
  placeholder,
  defaultValue,
  renderValue,
  className,
  searchable = false,
  filterOptions,
}) => {
  const selectedOption = listData.find(item => item.id === defaultValue) || null;

  const CustomPopper = (popperProps) => (
    <Popper
      {...popperProps}
      style={{ ...popperProps.style, width: 400 }} // Override width here (removes dependency on input width)
      disablePortal
    />
  );

  return (
    <FormControl className={s.select} sx={{ width: '100%' }}>
      {searchable ? (
        <Autocomplete
          options={listData}
          value={selectedOption}
          onChange={(event, newValue) => {
            const syntheticEvent = {
              target: { value: newValue ? newValue.id : '' },
            };
            onValueChange(syntheticEvent);
          }}
          getOptionLabel={option => option.name || (typeof option.option === 'string' ? option.option : '') || ''}
          filterOptions={filterOptions}
          popupIcon={
            <NewIcon style={{ width: 24, height: 24, fill: 'gray' }} />
          }
          className={className}
          sx={{
            width: '100%',
            '& .MuiAutocomplete-root': {
              width: '100%',
            },
            '& .MuiOutlinedInput-root': {
              width: '100% !important',
              padding: '0 !important',
              backgroundColor: 'var(--lightBackground)',
              color: 'var(--font)',
              minHeight: '40px',
              '& fieldset': { border: 0 },
              '&:hover fieldset': { border: 0 },
              '&.Mui-focused fieldset': { border: 0 },
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiAutocomplete-inputRoot': {
              width: '100% !important',
            },
            '& .MuiAutocomplete-input': {
              padding: '8px 10px !important',
              width: '100% !important',
              minWidth: '100%',
              boxSizing: 'border-box',
              color: 'var(--font)',
            },
            '& .MuiAutocomplete-popupIndicator': {
              transform: 'rotate(90deg)',
              paddingRight: '8px',
            },
          }}
          PopperComponent={CustomPopper}
          renderOption={(props, option) => (
            <li {...props}>
              {option.option}
            </li>
          )}
          ListboxProps={{
            sx: {
              width: '100%',
              backgroundColor: 'var(--lightBackground)',
              color: 'var(--font)',
              borderRadius: 0,
              '& .MuiAutocomplete-option': {
                '&[aria-selected="true"]': {
                  backgroundColor: 'var(--backgroundColor)',
                },
                '&.Mui-focused': {
                  backgroundColor: 'var(--backgroundColor)',
                },
              },
            },
          }}
            renderInput={params => (
              <TextField
                {...params}
                placeholder={placeholder}
                sx={{
                  width: '100%',
                }}
                InputProps={{
                  ...params.InputProps,
                  style: {
                    padding: 0,
                    width: '100%',
                    minHeight: '40px',
                  },
                }}
              />
            )}
          />
        ) : (
          <BaseSelect
            className={className}
            sx={{
              width: '100%',
              minHeight: '40px',
              boxShadow: 'none',
              '.MuiOutlinedInput-notchedOutline': { border: 0 },
              '&.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
                {
                  border: 0,
                },
              '& .MuiSelect-icon': {
                fill: 'gray',
                width: 24,
                transform: 'rotate(90deg)',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  minWidth: '400px !important',
                },
              },
            }}
            {...(renderValue ? { renderValue } : {})}
            value={defaultValue || placeholder}
            defaultValue={defaultValue || placeholder}
            IconComponent={NewIcon}
            onChange={onValueChange}
          >
            {!defaultValue && (
              <MenuItem
                disabled
                value={placeholder}
                sx={{
                  backgroundColor: 'var(--lightBackground)',
                  color: 'var(--font)',
                }}
              >
                <p>{placeholder}</p>
              </MenuItem>
            )}
            {listData.map((item, i) => (
              <MenuItem
                key={i}
                value={item.id}
                sx={{
                  backgroundColor: 'var(--lightBackground)',
                  color: 'var(--font)',
                  '&.Mui-selected': {
                    backgroundColor: 'var(--backgroundColor)',
                  },
                }}
              >
                {item.option}
              </MenuItem>
            ))}
          </BaseSelect>
        )}
    </FormControl>
  );
};

export default Dropdown;
