// Set while vaultRecovery rebuilds wallets with the vault locked on purpose:
// vaultSync then reports every wallet write as `write_while_locked`, which is
// expected for that window and must not reach Sentry as a defect.
let restoring = false;

export const setRestoringFromVault = value => {
  restoring = Boolean(value);
};

export const isRestoringFromVault = () => restoring;
