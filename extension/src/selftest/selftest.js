// Development-only diagnostics page (selftest.html, not in production
// builds). Runs the chain libraries the wallet depends on inside the
// extension page, to catch what the extension CSP or bundling breaks:
// address derivation for every chain, the derivation web workers, protobuf
// encoding (cosmjs) and the Breez WASM module. Uses a fresh random mnemonic
// and never touches the wallet's storage.
import {Buffer} from 'buffer';
import {
  addDeriveAddresses,
  createWallet,
  generateMnemonics,
} from 'myWallet/wallet.service';

globalThis.Buffer = globalThis.Buffer || Buffer;

const CHAINS = [
  'ethereum',
  'bitcoin',
  'bitcoin_segwit',
  'bitcoin_legacy',
  'bitcoin_taproot',
  'litecoin',
  'bitcoin_cash',
  'dogecoin',
  'zcash',
  'solana',
  'tron',
  'ripple',
  'tezos',
  'cosmos',
  'thorchain',
  'polkadot',
  'ton',
  'aptos',
  'cardano',
  'filecoin',
  'stellar',
  'hedera',
];

const results = [];
const out = document.getElementById('out');
const render = () => {
  out.textContent = JSON.stringify(results, null, 2);
};

const check = async (name, fn) => {
  const started = performance.now();
  try {
    const value = await fn();
    results.push({
      name,
      ok: true,
      ms: Math.round(performance.now() - started),
      value,
    });
  } catch (error) {
    results.push({
      name,
      ok: false,
      ms: Math.round(performance.now() - started),
      error: String(error?.message || error).slice(0, 300),
    });
  }
  render();
};

const short = value =>
  typeof value === 'string' ? `${value.slice(0, 10)}…` : value;

const run = async () => {
  const {mnemonic} = await generateMnemonics();
  const phrase = mnemonic.phrase;
  for (const chain of CHAINS) {
    await check(`derive:${chain}`, async () => {
      const wallet = await createWallet(chain, phrase, false);
      if (wallet === undefined) {
        return 'not a wallet.service chain';
      }
      const address =
        wallet?.address ?? wallet?.publicAddress ?? wallet?.addresses?.[0];
      if (!address && !wallet) {
        throw new Error('no wallet returned');
      }
      return short(
        typeof address === 'string'
          ? address
          : JSON.stringify(Object.keys(wallet || {})),
      );
    });
  }
  for (const chain of ['ethereum', 'solana', 'tron']) {
    await check(`worker:${chain}`, async () => {
      const derived = await addDeriveAddresses(chain, phrase, 1);
      return Array.isArray(derived)
        ? `${derived.length} addresses`
        : typeof derived;
    });
  }
  await check('protobuf:cosmos-MsgSend', async () => {
    const {Registry} = await import('@cosmjs/proto-signing');
    const {defaultRegistryTypes} = await import('@cosmjs/stargate');
    const registry = new Registry(defaultRegistryTypes);
    const bytes = registry.encode({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: 'cosmos1a',
        toAddress: 'cosmos1b',
        amount: [{denom: 'uatom', amount: '1'}],
      },
    });
    return `${bytes.length} bytes`;
  });
  await check('wasm:breez-sdk-spark', async () => {
    const {default: init} = await import('@breeztech/breez-sdk-spark/web');
    await init();
    return 'initialised';
  });
  document.body.dataset.done = 'true';
};

run();
