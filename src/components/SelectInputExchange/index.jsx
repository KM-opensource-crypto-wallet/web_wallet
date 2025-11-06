import { createFilterOptions } from '@mui/material/Autocomplete';
import Dropdown from 'components/Dropdown';
import Image from 'next/image';
import s from './SelectInputExchange.module.css';

const SelectInputExchange = ({
  listData,
  selectedValue,
  onValueChange,
  placeholder,
}) => {
  const list = listData.map(({value, label, options}) => ({
    id: value,
    name: label,
    searchableLabel: label,
    searchableChainDisplayName: options?.chain_display_name || '',
    searchableSymbol: options?.symbol || '',
    option: (
      <div key={value} className={s.option}>
        {options?.icon && (
          <div className={s.icon}>
            <Image src={options?.icon} width={40} height={40} alt={'icon'} />
          </div>
        )}
        <div className={s.value}>
          <div className={s.row}>
            <p>{label}</p>
            {options?.chain_display_name && (
              <p className={s.chainDisplayName}>
                {options?.chain_display_name}
              </p>
            )}
          </div>

          {options?.symbol && <span>{options?.symbol}</span>}
        </div>
      </div>
    ),
  }));

  // Custom filter function to search by label, chain_display_name, and symbol
  const filterOptions = createFilterOptions({
    matchFrom: 'any',
    stringify: option => {
      // Combine label, chain_display_name, and symbol for searching
      return `${option.searchableLabel} ${option.searchableChainDisplayName} ${option.searchableSymbol}`;
    },
  });

  return (
    <Dropdown
      defaultValue={selectedValue}
      onValueChange={onValueChange}
      listData={list}
      placeholder={placeholder}
      searchable={true}
      filterOptions={filterOptions}
    />
  );
};

export default SelectInputExchange;
