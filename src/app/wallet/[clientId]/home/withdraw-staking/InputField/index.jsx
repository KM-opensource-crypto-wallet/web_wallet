import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
} from '@mui/material';
import styles from '../WithdrawStaking.module.css';

const InputField = ({
  label,
  name,
  value,
  inputError,
  disableTextInput,
  inputSx,
  onChange,
  onBlur,
  maxBtnClick,
}) => {
  return (
    <div className={styles.inputView}>
      <FormControl sx={{m: 0, width: '100%'}} variant='outlined'>
        <InputLabel sx={inputSx} focused={false}>
          {label}
        </InputLabel>
        <OutlinedInput
          className={styles.input}
          id={name}
          name={name}
          onChange={onChange}
          onBlur={onBlur}
          readOnly={disableTextInput}
          value={value}
          label={label}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: inputError ? 'red' : 'var(--sidebarIcon)',
            },

            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: inputError ? 'red' : 'var(--borderActiveColor)',
            },

            '& .MuiInputLabel-outlined': {
              color: inputError ? 'red' : 'var(--sidebarIcon)',
            },
            '&:hover fieldset': {
              borderColor: 'var(--sidebarIcon) !important',
            },
          }}
          endAdornment={
            <InputAdornment position='end'>
              <button
                disabled={disableTextInput}
                className={styles.btnMax}
                hitSlop={{
                  top: 12,
                  left: 12,
                  right: 12,
                  bottom: 12,
                }}
                onClick={maxBtnClick}>
                <div className={styles.btnText}>Max</div>
              </button>
            </InputAdornment>
          }
        />
      </FormControl>
    </div>
  );
};

export default InputField;
