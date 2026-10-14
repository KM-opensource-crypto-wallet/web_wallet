// Sort menu entries for the Home asset list. `showDivider` draws a
// separator below the entry.
export const COIN_SORT_OPTIONS = [
  {label: 'Default', value: 'default', showDivider: true},
  {label: 'Value: High to Low', value: 'value_desc'},
  {label: 'Value: Low to High', value: 'value_asc'},
  {label: 'Balance: High to Low', value: 'balance_desc'},
  {label: 'Balance: Low to High', value: 'balance_asc', showDivider: true},
  {label: 'Name: A to Z', value: 'name_asc'},
  {label: 'Name: Z to A', value: 'name_desc'},
  {label: 'Symbol: A to Z', value: 'symbol_asc'},
  {label: 'Symbol: Z to A', value: 'symbol_desc'},
];
