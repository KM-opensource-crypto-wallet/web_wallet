import englishMnemonics from 'bip39/src/wordlists/english.json';
import carouselData from 'src/data/lists/carousel';

// App routing
export const DOK_WALLET_ID = '656d95510a58ec43999a0f77';
export const KIML_WALLET_ID = '65efefca5f95b9f06cc8f9eb';
export const KIML_WALLET_COLOR_CODE = '#4F8DD8';
export const DOK_WALLET_COLOR_CODE = '#F44D03';
export const ACTIVITY_THROTTLE_MS = 5000;
export const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'wheel'];
export const AUTO_LOCK_CHECK_INTERVAL_MS = 5000;

// customSignIn
export const FALLBACK_PATH = '/auth/login';

// ImportWallet
export const WORD_SET = new Set(englishMnemonics);
export const VALID_WORD_COUNTS = [12, 15, 18, 21, 24];
export const MAX_SUGGESTIONS = 6;

// Import Wallet by PK
export const INVALID_KEY =
  'This private key is not valid for the selected network.';

// Login
export const LOGIN_INITIAL_VALUES = {password: ''};
export const REPLAY_SKIP_LOCK_TTL_MS = 10000;

// Registration
export const REGISTRATION_INITIAL_VALUES = {password: '', passConfirm: ''};

// Name new wallet
export const WALLET_NAME_MAX_LENGTH = 24;
export const WALLET_NAME_SUGGESTIONS = [
  'Savings',
  'Trading',
  'DeFi',
  'Cold Storage',
];

// Carousel
export const CAROUSEL_LAST_INDEX = carouselData.length - 1;
export const SWIPE_THRESHOLD_PX = 50;

// Buy crypto
export const OTC_DETAILS_ROUTE = '/contact-us/otc';
export const BUY_CRYPTO_CURRENCIES = ['USD', 'EUR'];

// Receive funds
export const COPIED_RESET_MS = 2000;

// Send
export const MAX_RECENTS = 6;

// Staking
// Chains where the withdraw amount can't be edited.
export const STAKING_DISABLED_INPUT_CHAINS = ['solana'];

// Transaction
export const TRANSACTION_STATUS_LABEL = {
  success: 'Success',
  pending: 'Pending',
  failed: 'Failed',
};

// Home
// Per-browser preference: show balances as dots.
export const HIDE_BALANCES_KEY = 'home.hideBalances';
export const ALLOCATION_SLICES = 4;

// Swap
export const SWAP_QUOTE_DEBOUNCE_MS = 700;
export const SWAP_POLL_INTERVAL_MS = 30_000;
