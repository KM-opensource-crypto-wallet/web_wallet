// The rules of validationSchemaRegistration (still the one that decides),
// shown as a live checklist. Upper and lower case share a line.
export const PASSWORD_RULES = [
  {label: 'At least 8 characters', test: v => v.length >= 8},
  {
    label: 'Upper & lowercase letters',
    test: v => /[A-Z]/.test(v) && /[a-z]/.test(v),
  },
  {label: 'Contains a number', test: v => /[0-9]/.test(v)},
  {label: 'Contains a symbol (!@#$%^&*)', test: v => /[!@#$%^&*]/.test(v)},
];
