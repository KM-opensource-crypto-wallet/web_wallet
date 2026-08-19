'use client';

import React, {useCallback, useState} from 'react';
import EditIcon from '@mui/icons-material/Edit';
import {validateNumberInInput} from 'dok-wallet-blockchain-networks/helper';
import s from './SlippageEditor.module.css';

// Inline slippage row. Edits happen in local draft state so the field can
// be cleared while typing (an empty redux value used to snap back to the
// backend default instantly). The new value is committed once, on blur —
// no double refetch.
const SlippageEditor = ({slippage, backendSlippage, onCommit}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const displayValue = slippage || backendSlippage;

  const startEditing = useCallback(() => {
    setDraft(`${displayValue ?? ''}`);
    setIsEditing(true);
  }, [displayValue]);

  const onChangeDraft = useCallback(event => {
    setDraft(validateNumberInInput(event.target.value, 2));
  }, []);

  const finishEditing = useCallback(() => {
    setIsEditing(false);
    // Empty draft means "back to the provider default".
    if (draft !== `${slippage ?? ''}`) {
      onCommit?.(draft);
    }
  }, [draft, slippage, onCommit]);

  return (
    <div className={s.row}>
      <p className={s.label}>Slippage tolerance</p>
      {isEditing ? (
        <div className={s.valueRow}>
          <input
            className={s.input}
            inputMode='decimal'
            autoFocus={true}
            value={draft}
            onChange={onChangeDraft}
            onBlur={finishEditing}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }
            }}
            placeholder={`${backendSlippage ?? ''}`}
          />
          <p className={s.value}>%</p>
        </div>
      ) : (
        <button
          type='button'
          className={s.valueButton}
          onClick={startEditing}
          aria-label='Edit slippage tolerance'>
          <p className={s.value}>{`${displayValue}%`}</p>
          <EditIcon
            sx={{fontSize: 14, color: 'var(--gray)', marginLeft: '6px'}}
          />
        </button>
      )}
    </div>
  );
};

export default SlippageEditor;
