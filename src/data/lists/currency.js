const icons = require(`assets/images/icons`).default;

export const currencySymbol = {
  USD: '$',
  EUR: '€',
};

export const dollar = icons.dollar;
export const euro = icons.euro;
export const localCurrencyList = [
  {
    icon: dollar,
    label: 'United States Dollar',
    id: 'USD',
  },
  {
    icon: euro,
    label: 'Euro',
    id: 'EUR',
  },
];

export const currencyIcon = {
  USD: dollar,
  EUR: euro,
};
