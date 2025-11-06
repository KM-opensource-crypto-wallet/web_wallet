import s from './Dropdown.module.css';

import {
  Autocomplete,
  Select as BaseSelect,
  FormControl,
  MenuItem,
  TextField,
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
  // If searchable, use Autocomplete
  if (searchable) {
    const selectedOption = listData.find(item => item.id === defaultValue);

    return (
      <FormControl className={s.select}>
        <Autocomplete
          className={className}
          options={listData}
          value={selectedOption || null}
          onChange={(event, newValue) => {
            if (newValue) {
              // Create a synthetic event similar to Select's onChange
              const syntheticEvent = {
                target: {
                  value: newValue.id,
                },
              };
              onValueChange(syntheticEvent);
            }
          }}
          getOptionLabel={option => option.name || ''}
          filterOptions={filterOptions}
          renderOption={(props, option) => (
            <li {...props} key={option.id}>
              {option.option}
            </li>
          )}
          renderInput={params => (
            <TextField
              {...params}
              placeholder={placeholder}
              sx={{
                '& .MuiOutlinedInput-root': {
                  padding: '4px 9px',
                  backgroundColor: 'var(--lightBackground)',
                  color: 'var(--font)',
                  '& fieldset': {
                    border: 0,
                  },
                  '&:hover fieldset': {
                    border: 0,
                  },
                  '&.Mui-focused fieldset': {
                    border: 0,
                  },
                },
                '& .MuiInputBase-input': {
                  color: 'var(--font)',
                },
                '& .MuiAutocomplete-endAdornment': {
                  '& .MuiSvgIcon-root': {
                    fill: 'gray',
                  },
                },
              }}
            />
          )}
          sx={{
            width: '100%',
            '& .MuiAutocomplete-popupIndicator': {
              transform: 'rotate(90deg)',
            },
          }}
          popupIcon={<NewIcon style={{width: 24, height: 24, fill: 'gray'}} />}
          ListboxProps={{
            sx: {
              backgroundColor: 'var(--lightBackground)',
              color: 'var(--font)',
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
        />
      </FormControl>
    );
  }

  // Original Select implementation for non-searchable dropdowns
  return (
    <FormControl className={s.select}>
      <BaseSelect
        className={className}
        sx={{
          boxShadow: 'none',
          '.MuiOutlinedInput-notchedOutline': {border: 0},
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
        {...(renderValue ? {renderValue} : {})}
        value={defaultValue || placeholder}
        defaultValue={defaultValue || placeholder}
        IconComponent={NewIcon}
        onChange={onValueChange}>
        {!defaultValue && (
          <MenuItem
            disabled
            value={placeholder}
            sx={{
              backgroundColor: 'var(--lightBackground)',
              color: 'var(--font)',
            }}>
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
            }}>
            {item.option}
          </MenuItem>
        ))}
      </BaseSelect>
    </FormControl>
  );
};

export default Dropdown;
