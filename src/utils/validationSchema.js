import * as Yup from 'yup';

const addressRegex = /^[a-zA-Z0-9][a-zA-Z0-9 .,-]*$/;

export const validationSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Email is invalid').required('Email is required'),
  address1: Yup.string()
    .min(2, 'Must be at least ${min} characters')
    .max(40, 'Must be no more than ${max} characters')
    .matches(
      addressRegex,
      'May only contain hyphens, periods, commas or alphanumeric characters',
    )
    .required('Address is required'),
  address2: Yup.string()
    .nullable()
    .max(40, 'Must be no more than ${max} characters')
    .matches(addressRegex, {
      excludeEmptyString: true,
      message:
        'May only contain hyphens, periods, commas or alphanumeric characters',
    }),
  city: Yup.string()
    .max(15, 'Must be no more than ${max} characters')
    .matches(
      addressRegex,
      'May only contain hyphens, periods, commas or alphanumeric characters',
    )
    .required('City is required'),
});

export const validationSchemaCryptoOptions = Yup.object().shape({
  crypto: Yup.string().required('Required'),
  amount: Yup.string().required('Required'),
  terms: Yup.bool().oneOf([true], 'Accept terms is required'),
  risk: Yup.bool().oneOf([true], 'Accept risk is required'),
});

export const validationSchemaSendFunds = (
  balanceAmount = 0,
  currencyBalanceAmount = 0,
) =>
  Yup.object().shape({
    send: Yup.string().required('Address is not valid!'),
    amount: Yup.number()
      .typeError('Please enter number value only')
      .positive('Must be a positive number.')
      .required(
        'The amount that you entered is invalid. Please enter an amount which is less or equal to your available balance.',
      )
      .max(balanceAmount, 'Amount greater than balance'),
    memo: Yup.string().trim().max(200).optional(),
  });

export const validationSchemaRegistration = Yup.object().shape({
  password: Yup.string()
    .required(
      'Create your password using 8 characters or more. It MUST include at least one uppercase character, lowercase character, number and symbol.',
    )
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/,
      'Create your password using 8 characters or more. It MUST include at least one uppercase character, lowercase character, number and symbol.',
    ),
  // .matches(/^.*$/),
  passConfirm: Yup.string()
    .required('Please enter your password')
    .oneOf([Yup.ref('password'), null], "Passwords don't match."),
});

export const validationSchemaLogin = Yup.object().shape({
  password: Yup.string().required('* Password cannot be empty'),
});

export const validationSchemaChangePassword = Yup.object().shape({
  currentPassword: Yup.string().required('Current passwords is not valid.'),
  newPassword: Yup.string()
    .required(
      'Create your password using 8 characters or more. It MUST include at least one uppercase character, lowercase character, number and symbol.',
    )
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})/,
      'Create your password using 8 characters or more. It MUST include at least one uppercase character, lowercase character, number and symbol.',
    ),
  retypePassword: Yup.string()
    .required('Please enter your new password')
    .oneOf([Yup.ref('newPassword'), null], 'New passwords don`t match.'),
});

export const validationSchemaFingerprintVerification = Yup.object().shape({
  currentPassword: Yup.string().required('* Wrong password'),
});

export const validationSchemaOTC = Yup.object().shape({
  fullname: Yup.string().required('Full name is required'),
  email: Yup.string()
    .required('Email is required')
    .email('Enter a valid email'),
  address1: Yup.string().required('Address 1 is required'),
  city: Yup.string().required('City/State is required'),
  zipcode: Yup.string().required('Postal Code is required'),
  country: Yup.string().required('County is required'),
});

export const modalAddTokenValidation = Yup.object().shape({
  contract_address: Yup.string().required('contract_address is not valid'),
  name: Yup.string().required('name is required'),
  symbol: Yup.string().required('symbol; is required'),
  decimal: Yup.string().required('decimal is required'),
});

export const amountValidation = Yup.object().shape({
  amount: Yup.number()
    .typeError('amount must be number')
    .positive('amount must be positive')
    .required('amount cannot be empty'),
  selectedCoin: Yup.object().required('Coin is required'),
});

export const sellCryptoValidation = Yup.object().shape({
  amount: Yup.number()
    .typeError('amount must be number')
    .positive('amount must be positive')
    .required('amount cannot be empty'),
  selectedCoin: Yup.object().required('Coin is required'),
});

export const validationSchemaSolanaStaking = (balanceAmount = 0) =>
  Yup.object().shape({
    validatorPubKey: Yup.object().required('validator is not valid!'),
    amount: Yup.number()
      .typeError('Please enter number value only')
      .positive('Must be a positive number.')
      .required(
        'The amount that you entered is invalid. Please enter an amount which is less or equal to your available balance.',
      )
      .max(balanceAmount, 'Amount greater than balance')
      .test('min-staking', '', function (value) {
        // Minimum is read from the selected validator so per-validator/provider
        // minimums work for free. Only enforced when the value is present.
        const minAmount = this.parent?.validatorPubKey?.options?.minAmount;
        if (
          minAmount != null &&
          Number(minAmount) > 0 &&
          value != null &&
          Number(value) < Number(minAmount)
        ) {
          return this.createError({
            message: `Minimum staking amount is ${minAmount} SOL`,
          });
        }
        return true;
      }),
  });

export const validationSchemaDefaultStaking = (balanceAmount = 0) =>
  Yup.object().shape({
    amount: Yup.number()
      .typeError('Please enter number value only')
      .positive('Must be a positive number.')
      .required(
        'The amount that you entered is invalid. Please enter an amount which is less or equal to your available balance.',
      )
      .max(balanceAmount, 'Amount greater than available balance'),
    validatorPubKey: Yup.object().required('validator is not valid!'),
  });

export const validationSchemaTronStaking = (balanceAmount = 0) =>
  Yup.object().shape({
    resourceType: Yup.object().required('resourceType is not valid!'),
    amount: Yup.number()
      .typeError('Please enter number value only')
      .positive('Must be a positive number.')
      .required(
        'The amount that you entered is invalid. Please enter an amount which is less or equal to your available balance.',
      )
      .max(balanceAmount, 'Amount greater than balance'),
  });

export const validationSchemaWithdrawStaking = (
  balanceAmount = 0,
  currencyBalanceAmount = 0,
) =>
  Yup.object().shape({
    amount: Yup.number()
      .typeError('Please enter number value only')
      .positive('Must be a positive number.')
      .required(
        'The amount that you entered is invalid. Please enter an amount which is less or equal to your available balance.',
      )
      .max(balanceAmount, 'Amount greater than balance'),
    currencyAmount: Yup.number()
      .typeError('Please enter number value only')
      .positive('Must be a positive number.')
      .required(
        'The currency amount that you entered is invalid. Please enter an amount which is less or equal to your available balance.',
      )
      .max(currencyBalanceAmount, 'Currency amount greater than balance'),
  });

const validatationSchemForCreateStaking = {
  tron: validationSchemaTronStaking,
  solana: validationSchemaSolanaStaking,
};

export const getValidationSchemaForCreateStaking = (
  chain_name,
  balanceAmount = 0,
) => {
  return (
    validatationSchemForCreateStaking[chain_name]?.(balanceAmount) ??
    validationSchemaDefaultStaking(balanceAmount)
  );
};

export const updateTransactionValidation = Yup.object().shape({
  tx: Yup.string().required('amount cannot be empty'),
});
