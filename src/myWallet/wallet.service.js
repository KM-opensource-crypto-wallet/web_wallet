import {captureError} from 'services/logger';
import * as bip39 from 'bip39';
import {ethers} from 'ethers';
import {BIP32Factory} from 'bip32';
import ecc from '@bitcoinerlab/secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import {mnemonicToSeed} from 'bip39';
import {derivePath} from 'ed25519-hd-key';
import {Keypair} from '@solana/web3.js';
import bs58 from 'bs58';
import {TronWeb} from 'tronweb';
import {Wallet} from 'xrpl';
import {InMemorySigner} from '@taquito/signer';
import {config} from 'dok-wallet-blockchain-networks/config/config';
import {DirectSecp256k1HdWallet} from '@cosmjs/proto-signing';
import {Client} from '@xchainjs/xchain-thorchain';
import {Keyring} from '@polkadot/keyring';
import {keyPairFromSeed} from '@ton/crypto';
import {WalletContractV4} from '@ton/ton';
import {Account, SigningSchemeInput} from '@aptos-labs/ts-sdk';
import {toCashAddress} from 'bchaddrjs';
import {BlockfrostProvider, MeshWallet} from '@meshsdk/core';
import {keyPairFromPrivateKey} from '@nodefactory/filecoin-address';
import {
  CHANGE_CHAIN,
  GAP_LIMIT,
  RECEIVE_CHAIN,
  buildAddressByChain,
  deriveAddressRange,
  getAccountBasePath,
  getNetworkByChainName,
} from 'dok-wallet-blockchain-networks/service/bitcoinHdAddress';

const createEvmWallet = async mnemonic => {
  try {
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic);
    return {
      privateKey: wallet.privateKey,
      address: wallet.address?.toString(),
    };
  } catch (e) {
    console.error('Error in creating arbitrum wallet', e);
    throw e;
  }
};

// Network + account base path come from the shared bitcoinHdAddress helpers,
// which read IS_SANDBOX themselves -- the same value createWallet is always
// invoked with (see cryptoChain/index.js), so the `isSandbox` argument the
// public entry points still accept is redundant for the bitcoin chains.
const getBitcoinRoot = (chain_name, mnemonic) => {
  const network = getNetworkByChainName(chain_name);
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  return {network, root: BIP32Factory(ecc).fromSeed(seed, network)};
};

// Extended keys of the account-level node (m/84'|49'|44'/coinType'/0'), which
// is all deriveAddressRange needs to walk either standard chain.
const getBitcoinAccount = (chain_name, mnemonic) => {
  const {root} = getBitcoinRoot(chain_name, mnemonic);
  const accountNode = root.derivePath(getAccountBasePath(chain_name));
  return {
    extendedPublicKey: accountNode.neutered().toBase58(),
    extendedPrivateKey: accountNode.toBase58(),
  };
};

// BIP44 standard account layout: 20 external/receive (.../0/i) + 20
// internal/change (.../1/i), what BlueWallet / Electrum / hardware wallets
// derive. The coin's own address stays .../0/0 -- the same path the previous
// nonstandard ".../i/0" window started on, so existing wallets keep theirs.
const createBitcoinChainWallet = chain_name => async mnemonic => {
  try {
    const {extendedPublicKey, extendedPrivateKey} = getBitcoinAccount(
      chain_name,
      mnemonic,
    );
    const common = {chain_name, accountKey: extendedPrivateKey, start: 0};
    const deriveAddresses = [
      ...deriveAddressRange({
        ...common,
        chainIndex: RECEIVE_CHAIN,
        count: GAP_LIMIT,
      }),
      ...deriveAddressRange({
        ...common,
        chainIndex: CHANGE_CHAIN,
        count: GAP_LIMIT,
      }),
    ];
    const primary = deriveAddresses[0];
    if (!primary?.address) {
      throw new Error(`could not derive ${chain_name} account addresses`);
    }
    return {
      privateKey: primary.privateKey,
      address: primary.address,
      extendedPublicKey,
      extendedPrivateKey,
      deriveAddresses,
    };
  } catch (e) {
    console.error('Error in createBitcoinChainWallet', chain_name, e);
    throw e;
  }
};

const createSolanaWallet = async mnemonic => {
  try {
    const path = "m/44'/501'/0'/0'";
    const seed = await mnemonicToSeed(mnemonic);
    const derivedSeed = derivePath(path, seed).key;
    const keyPair = Keypair.fromSeed(derivedSeed);
    return {
      address: keyPair.publicKey.toBase58(),
      privateKey: bs58.encode(keyPair.secretKey),
    };
  } catch (e) {
    console.error('Error in createSolanaWallet', e);
    throw e;
  }
};

const createTezosWallet = async mnemonic => {
  try {
    const wallet = InMemorySigner.fromMnemonic({mnemonic});
    const address = await wallet.publicKeyHash();
    const privateKey = await wallet.secretKey();
    return {
      address,
      privateKey,
    };
  } catch (e) {
    console.error('Error in createTezosWallet', e);
    throw e;
  }
};

const createRippleWallet = async mnemonic => {
  try {
    const wallet = Wallet.fromMnemonic(mnemonic);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
    };
  } catch (e) {
    console.error('Error in createRippleWallet', e);
    throw e;
  }
};

const createTronWallet = mnemonic => {
  try {
    const wallet = TronWeb.fromMnemonic(mnemonic);
    return {
      privateKey: wallet?.privateKey?.substring(2),
      address: wallet.address?.toString(),
    };
  } catch (e) {
    console.error('Error in creating tron wallet', e);
    throw e;
  }
};

const createLitecoinWallet = async mnemonic => {
  try {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed, config.LITECOIN_NETWORK_STRING);
    const child1 = root.derivePath("m/84'/2'/0'/0/0");
    const {address} = bitcoin.payments.p2wpkh({
      pubkey: child1.publicKey,
      network: config.LITECOIN_NETWORK_STRING,
    });
    return {
      privateKey: child1.toWIF(),
      address,
    };
  } catch (e) {
    console.error('Error in createLitecoinWallet', e);
    throw e;
  }
};

const createDogecoinWallet = async mnemonic => {
  try {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed, config.DOGECOIN_NETWORK_STRING);
    const child1 = root.derivePath("m/44'/3'/0'/0/0");
    const {address} = bitcoin.payments.p2pkh({
      pubkey: child1.publicKey,
      network: config.DOGECOIN_NETWORK_STRING,
    });
    return {
      privateKey: child1.toWIF(),
      address,
    };
  } catch (e) {
    console.error('Error in createDogecoinWallet', e);
    throw e;
  }
};

const createBitcoinCashWallet = async mnemonic => {
  try {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const bip32 = BIP32Factory(ecc);
    const root = bip32.fromSeed(seed, config.BITCOIN_CASH_NETWORK);
    const child1 = root.derivePath("m/44'/145'/0'/0/0");
    let {address} = bitcoin.payments.p2pkh({
      pubkey: child1.publicKey,
      network: config.BITCOIN_CASH_NETWORK,
    });
    address = toCashAddress(address).replace('bitcoincash:', '');
    return {
      privateKey: child1.toWIF(),
      address,
    };
  } catch (e) {
    console.error('Error in createBitcoinCashWallet', e);
    throw e;
  }
};

const createCosmosWallet = async mnemonic => {
  try {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
    const accountData = await wallet.getAccountsWithPrivkeys();
    const address = accountData[0].address;
    const privkeyBuffer = accountData[0].privkey;
    const privateKey = Buffer.from(privkeyBuffer).toString('hex');
    return {
      privateKey,
      address,
    };
  } catch (e) {
    console.error('Error in createCosmosWallet', e);
    throw e;
  }
};

const createThorWallet = async mnemonic => {
  try {
    const {Client} = require('@xchainjs/xchain-thorchain');
    const thorClient = new Client({phrase: mnemonic});
    const address = await thorClient.getAddressAsync();
    const privKey = await thorClient.getPrivateKey();
    const privateKey = privKey?.key?.toString('base64');
    return {
      privateKey,
      address,
    };
  } catch (e) {
    console.error('Error in createThorWallet', e);
    throw e;
  }
};

const createPolkadotWallet = async mnemonic => {
  try {
    const seed = await mnemonicToSeed(mnemonic);
    const privateKey = derivePath("m/44'/354'/0'/0'/0'", seed).key;
    const keyring = new Keyring({ss58Format: 0});
    const keypair = keyring.addFromSeed(privateKey);
    return {
      address: keypair.address,
      privateKey: privateKey?.toString('hex'),
    };
  } catch (e) {
    console.error('Error in createPolkadotWallet', e);
    throw e;
  }
};

const createTonWallet = async mnemonic => {
  try {
    const seed = await mnemonicToSeed(mnemonic);
    const privateKey = derivePath("m/44'/607'/0'", seed).key;
    const keyPair = keyPairFromSeed(privateKey);

    const wallet = WalletContractV4.create({
      publicKey: keyPair.publicKey,
      workchain: 0,
    });
    return {
      address: wallet.address.toString(),
      privateKey: privateKey.toString('hex'),
    };
  } catch (e) {
    console.error('Error in createTonWallet', e);
    throw e;
  }
};

const createAptosWallet = async mnemonic => {
  try {
    const account = Account.fromDerivationPath({
      path: "m/44'/637'/0'/0'/0'",
      legacy: true,
      mnemonic: mnemonic,
      scheme: SigningSchemeInput.Ed25519,
    });

    return {
      address: account.accountAddress.toString(),
      privateKey: account.privateKey.toString().substring(2),
    };
  } catch (e) {
    console.error('Error in createAptosWallet', e);
    throw e;
  }
};

const createCardanoWallet = async mnemonic => {
  try {
    const provider = new BlockfrostProvider(config.BLOCKFROST_API_KEY);
    const wallet = new MeshWallet({
      networkId: 1,
      fetcher: provider,
      submitter: provider,
      key: {type: 'mnemonic', words: mnemonic.split(' ')},
    });
    await wallet.init();

    return {address: wallet.addresses.baseAddressBech32};
  } catch (e) {
    console.error('Error in createCardanoWallet', e);
    throw e;
  }
};

const createFilecoinWallet = async (mnemonic, isSandbox) => {
  try {
    const path = isSandbox ? "m/44'/1'/0'/0/0" : "m/44'/461'/0'/0/0";
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const bip32 = BIP32Factory(ecc).fromSeed(seed).derivePath(path);
    const privateKey = bip32.privateKey;

    const generatedKeypair = keyPairFromPrivateKey(
      privateKey,
      isSandbox ? 't' : 'f',
    );

    return {
      address: generatedKeypair.address.toString(),
      privateKey: generatedKeypair.privateKey,
    };
  } catch (e) {
    console.error('Error in createFilecoinWallet', e);
    throw e;
  }
};

const createWalletObj = {
  ethereum: createEvmWallet,
  base: createEvmWallet,
  binance_smart_chain: createEvmWallet,
  optimism_binance_smart_chain: createEvmWallet,
  polygon: createEvmWallet,
  optimism: createEvmWallet,
  arbitrum: createEvmWallet,
  avalanche: createEvmWallet,
  fantom: createEvmWallet,
  gnosis: createEvmWallet,
  viction: createEvmWallet,
  linea: createEvmWallet,
  zksync: createEvmWallet,
  kava: createEvmWallet,
  ethereum_classic: createEvmWallet,
  bitcoin: createBitcoinChainWallet('bitcoin'),
  bitcoin_segwit: createBitcoinChainWallet('bitcoin_segwit'),
  bitcoin_legacy: createBitcoinChainWallet('bitcoin_legacy'),
  bitcoin_taproot: createBitcoinChainWallet('bitcoin_taproot'),
  litecoin: createLitecoinWallet,
  bitcoin_cash: createBitcoinCashWallet,
  solana: createSolanaWallet,
  tron: createTronWallet,
  ripple: createRippleWallet,
  tezos: createTezosWallet,
  cosmos: createCosmosWallet,
  thorchain: createThorWallet,
  polkadot: createPolkadotWallet,
  ton: createTonWallet,
  dogecoin: createDogecoinWallet,
  aptos: createAptosWallet,
  cardano: createCardanoWallet,
  filecoin: createFilecoinWallet,
};

const createEVMDeriveAddress = (mnemonic, startingIndex) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/evmDerivePathWorker.js', import.meta.url),
    );
    worker.onmessage = function (event) {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = function (event) {
      worker.terminate();
      // Workers run outside the Sentry client; `event.error` is often absent
      // for worker ErrorEvents. Never attach the posted mnemonic payload.
      const error = event.error ?? new Error(event.message || 'worker error');
      captureError(error, {tags: {area: 'wallet', op: 'derive_evm'}});
      reject(error);
    };
    worker.postMessage({mnemonic, startingIndex});
  });
};

const createSolanaDeriveAddresses = async (mnemonic, startingIndex) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/solanaDerivePathWorker.js', import.meta.url),
    );
    worker.onmessage = function (event) {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = function (event) {
      worker.terminate();
      // Workers run outside the Sentry client; `event.error` is often absent
      // for worker ErrorEvents. Never attach the posted mnemonic payload.
      const error = event.error ?? new Error(event.message || 'worker error');
      captureError(error, {tags: {area: 'wallet', op: 'derive_solana'}});
      reject(error);
    };
    worker.postMessage({mnemonic, startingIndex});
  });
};

const createTronDeriveAddress = async (mnemonic, startingIndex) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/tronDerivePathWorker.js', import.meta.url),
    );
    worker.onmessage = function (event) {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = function (event) {
      worker.terminate();
      // Workers run outside the Sentry client; `event.error` is often absent
      // for worker ErrorEvents. Never attach the posted mnemonic payload.
      const error = event.error ?? new Error(event.message || 'worker error');
      captureError(error, {tags: {area: 'wallet', op: 'derive_tron'}});
      reject(error);
    };
    worker.postMessage({mnemonic, startingIndex});
  });
};
export const generateMnemonics = async () => {
  return {
    mnemonic: {
      phrase: bip39.generateMnemonic(),
    },
  };
};

const addDeriveAddressObj = {
  ethereum: createEVMDeriveAddress,
  solana: createSolanaDeriveAddresses,
  tron: createTronDeriveAddress,
};

export const createWallet = async (chain_name, phrase, isSandbox) => {
  return await createWalletObj[chain_name]?.(phrase, isSandbox);
};

export const addDeriveAddresses = async (
  chain_name,
  mnemonics,
  startingIndex,
) => {
  return await addDeriveAddressObj[chain_name]?.(mnemonics, startingIndex);
};

const addCustomEVMDeriveAddress = (mnemonics, customDerivePath) => {
  try {
    const wallet = ethers.HDNodeWallet.fromPhrase(
      mnemonics,
      null,
      customDerivePath,
    );
    return {
      privateKey: wallet.privateKey,
      address: wallet.address?.toString(),
      derivePath: customDerivePath,
    };
  } catch (e) {
    console.error('Error in addCustomEVMDeriveAddress', e);
    throw e;
  }
};

const addCustomSolanaDeriveAddress = async (mnemonic, customDerivePath) => {
  try {
    const defaultSeed = await mnemonicToSeed(mnemonic);
    const defaultDeriveSeed = derivePath(customDerivePath, defaultSeed).key;
    const keyPair = Keypair.fromSeed(defaultDeriveSeed);
    return {
      address: keyPair.publicKey.toBase58(),
      privateKey: bs58.encode(keyPair.secretKey),
      derivePath: customDerivePath,
    };
  } catch (e) {
    console.error('Error in addCustomSolanaDeriveAddress', e);
    throw e;
  }
};

const addCustomTronDeriveAddress = async (mnemonic, customDerivePath) => {
  try {
    const wallet = TronWeb.fromMnemonic(mnemonic, customDerivePath);
    return {
      privateKey: wallet?.privateKey?.substring(2),
      address: wallet.address?.toString(),
      derivePath: customDerivePath,
    };
  } catch (e) {
    console.error('Error in addCustomTronDeriveAddress', e);
    throw e;
  }
};
// One arbitrary derive path (Ledger/Metamask style accounts, e.g.
// m/84'/0'/5'/0/0), so it cannot go through deriveAddressRange -- that only
// walks the two standard chains under the account base path.
const addCustomBitcoinDeriveAddress =
  chain_name => async (mnemonic, customDerivePath) => {
    try {
      const {network, root} = getBitcoinRoot(chain_name, mnemonic);
      const child = root.derivePath(customDerivePath);
      return {
        privateKey: child.toWIF(),
        // Shared with the standard windows (deriveAddressRange) so every
        // address type, taproot included, is built in exactly one place.
        address: buildAddressByChain(
          chain_name,
          // eslint-disable-next-line no-undef
          Buffer.from(child.publicKey),
          network,
        ),
        derivePath: customDerivePath,
      };
    } catch (e) {
      console.error('Error in addCustomBitcoinDeriveAddress', chain_name, e);
      throw e;
    }
  };

const addCustomDerivePath = {
  ethereum: addCustomEVMDeriveAddress,
  solana: addCustomSolanaDeriveAddress,
  tron: addCustomTronDeriveAddress,
  bitcoin: addCustomBitcoinDeriveAddress('bitcoin'),
  bitcoin_segwit: addCustomBitcoinDeriveAddress('bitcoin_segwit'),
  bitcoin_legacy: addCustomBitcoinDeriveAddress('bitcoin_legacy'),
  bitcoin_taproot: addCustomBitcoinDeriveAddress('bitcoin_taproot'),
};
export const addCustomDeriveAddressToWallet = async (
  chain_name,
  mnemonics,
  customDerivePath,
  isSandbox,
) => {
  try {
    const resp = await addCustomDerivePath[chain_name]?.(
      mnemonics,
      customDerivePath,
      isSandbox,
    );
    return {account: resp};
  } catch (e) {
    console.error('Error in addCustomDeriveAddressToWallet', e);
    throw e;
  }
};
