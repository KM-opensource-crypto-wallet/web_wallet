import Dropdown from 'components/Dropdown';
import s from './DokDropdown.module.css';

const DokDropdown = ({listData, onValueChange, placeholder, value}) => {
  const list = listData.map(item => ({
    id: item.value,
    option: item.label,
  }));

  return (
    <Dropdown
      onValueChange={onValueChange}
      listData={list}
      placeholder={placeholder}
      defaultValue={value}
      bordered
    />
  );
};

export default DokDropdown;
