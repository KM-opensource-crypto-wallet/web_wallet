import * as React from 'react';
import DokDropdown from '../DokDropdown';
import styles from './LightningDropDown.module.css';
const data = [
  { label: 'Receive via Lightning Address', value: 'lightning_address' },
  { label: 'Receive via BTC mainnet', value: 'btc_mainnet' },
  { label: 'Receive via Invoice', value: 'invoice' },
];
const LightningDropDown = ({ isLightning, handleLightningDropDownChange }) => {
  const [selectedValue, setSelectedValue] = React.useState(data[0].value);

  const handleOnChangeValue = React.useCallback(
    event => {
      const value = event.target.value;

      setSelectedValue(value);

      const selectedItem = data.find(d => d.value === value);
      handleLightningDropDownChange(selectedItem?.label);
    },
    [handleLightningDropDownChange],
  );

  if (!isLightning) return null;

  return (
    <div className={styles.dropdownContainer}>
      <DokDropdown
        listData={data}
        value={selectedValue}
        onValueChange={handleOnChangeValue}
        placeholder="Select Invoice Type"
      />
    </div>
  );
};

export default LightningDropDown;
