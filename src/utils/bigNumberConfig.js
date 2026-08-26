import BigNumber from 'bignumber.js';

// Crypto amounts routinely fall below BigNumber's default exponential
// threshold of 1e-7 (a 13-sat fee is 1.3e-7 BTC), which made toString() render
// amounts as "1.3e-7". Widen the range so no balance, fee or amount is ever
// displayed in scientific notation. Bounds cover 18-decimal assets and
// wei-scale raw values. Only this instance is affected; copies vendored inside
// tronweb/xchainjs keep their own defaults.
//
// Side-effect module: imported for its configuration, not for a value. It is
// pulled in from both src/app/layout.js (server components and the
// src/app/api/** route handlers) and src/redux/StateProvider.jsx (the browser
// bundle), since Next.js gives those two separate module registries.
BigNumber.config({EXPONENTIAL_AT: [-30, 40]});
