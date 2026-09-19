// Zcash keygen on web. Mobile derives these natively (ZcashCoin.java /
// ZcashCoin.swift on WalletCore); this suite pins the web bridge to the same
// scheme: BIP44 account m/44'/133'/0' (mainnet) or m/44'/1'/0' (testnet),
// Bitcoin WIF version bytes, 20 receive + 20 change addresses, and Zcash's
// 2-byte transparent P2PKH prefixes (t1... = 0x1CB8, tm... = 0x1D25).
//
// The derivation scheme itself was checked against WalletCore's published
// vector ("ripple scissors kick mammal hire column oak again sun offer wealth
// tomorrow wagon turn fatal" + passphrase TREZOR -> t1RygJmrLdNGgi98gUgEJDTVaELTAYWoMBy
// at m/44'/133'/0'/0/0). The app derives with an empty passphrase, so the
// pinned values below are for the standard "abandon ... about" mnemonic.
import bs58 from 'bs58';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import ecc from '@bitcoinerlab/secp256k1';

const ECPair = ECPairFactory(ecc);

const ABANDON =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const MAINNET_ADDRESS = 't1XVXWCvpMgBvUaed4XDqWtgQgJSu1Ghz7F';
const MAINNET_WIF = 'KzEVy5oaBPhVPxH43bUg1g1zTv5Jitvc9nZesqqqc18Edi4bHQbu';

const MAINNET_P2PKH_PREFIX = [0x1c, 0xb8];
const TESTNET_P2PKH_PREFIX = [0x1d, 0x25];

// wallet.service reads IS_SANDBOX at module scope through the shared config,
// so each network gets a fresh module registry with only that flag overridden.
const load = isSandbox => {
  jest.resetModules();
  jest.doMock('dok-wallet-blockchain-networks/config/config', () => ({
    ...jest.requireActual('dok-wallet-blockchain-networks/config/config'),
    IS_SANDBOX: isSandbox,
  }));
  const service = require('myWallet/wallet.service');
  const {
    ZcashChain,
  } = require('dok-wallet-blockchain-networks/cryptoChain/chains/ZcashChain');
  return {...service, zcashChain: ZcashChain()};
};

// Base58check payload of a transparent address: 2-byte prefix + hash160.
const decodeAddress = address => {
  const decoded = Buffer.from(bs58.decode(address));
  expect(decoded.length).toBe(26);
  const payload = decoded.subarray(0, 22);
  const checksum = bitcoin.crypto.hash256(payload).subarray(0, 4);
  expect(Buffer.from(decoded.subarray(22)).equals(Buffer.from(checksum))).toBe(
    true,
  );
  return {prefix: [payload[0], payload[1]], hash160: payload.subarray(2)};
};

const hash160OfWif = (wif, network) =>
  bitcoin.crypto.hash160(ECPair.fromWIF(wif, network).publicKey);

const expectStandardPaths = (deriveAddresses, basePath) => {
  const expected = [0, 1].flatMap(chainIndex =>
    Array.from({length: 20}, (_, i) => `${basePath}/${chainIndex}/${i}`),
  );
  expect(deriveAddresses.map(item => item.derivePath)).toEqual(expected);
};

describe('createWallet("zcash") on mainnet', () => {
  let wallet;
  let zcashChain;

  beforeAll(async () => {
    const service = load(false);
    zcashChain = service.zcashChain;
    wallet = await service.createWallet('zcash', ABANDON, false);
  });

  it("derives the m/44'/133'/0'/0/0 t1... address and WIF", () => {
    expect(wallet.address).toBe(MAINNET_ADDRESS);
    expect(wallet.privateKey).toBe(MAINNET_WIF);
  });

  it('encodes hash160(pubkey) under the mainnet P2PKH prefix', () => {
    const {prefix, hash160} = decodeAddress(wallet.address);
    expect(prefix).toEqual(MAINNET_P2PKH_PREFIX);
    expect(
      Buffer.from(hash160).equals(
        hash160OfWif(wallet.privateKey, bitcoin.networks.bitcoin),
      ),
    ).toBe(true);
  });

  it('ships the BIP44 receive + change window with the wallet', () => {
    expect(wallet.deriveAddresses).toHaveLength(40);
    expectStandardPaths(wallet.deriveAddresses, "m/44'/133'/0'");
    expect(wallet.deriveAddresses[0]).toEqual({
      derivePath: "m/44'/133'/0'/0/0",
      address: wallet.address,
      privateKey: wallet.privateKey,
    });
    const addresses = new Set(wallet.deriveAddresses.map(i => i.address));
    expect(addresses.size).toBe(40);
    wallet.deriveAddresses.forEach(item => {
      expect(item.address.startsWith('t1')).toBe(true);
      expect(zcashChain.isValidPrivateKey({privateKey: item.privateKey})).toBe(
        true,
      );
    });
  });

  it('matches what the chain itself derives from the private key', () => {
    expect(
      zcashChain.createWalletByPrivateKey({privateKey: wallet.privateKey}),
    ).toEqual({address: wallet.address, privateKey: wallet.privateKey});
  });

  it('does not carry extended keys (native returns none for zcash)', () => {
    expect(wallet.extendedPublicKey).toBeUndefined();
    expect(wallet.extendedPrivateKey).toBeUndefined();
  });
});

describe('createWallet("zcash") on testnet', () => {
  let wallet;

  beforeAll(async () => {
    const service = load(true);
    wallet = await service.createWallet('zcash', ABANDON, true);
  });

  it('derives a tm... address on the universal testnet coin type', () => {
    expect(wallet.address.startsWith('tm')).toBe(true);
    const {prefix, hash160} = decodeAddress(wallet.address);
    expect(prefix).toEqual(TESTNET_P2PKH_PREFIX);
    expect(
      Buffer.from(hash160).equals(
        hash160OfWif(wallet.privateKey, bitcoin.networks.testnet),
      ),
    ).toBe(true);
    expect(wallet.deriveAddresses).toHaveLength(40);
    expectStandardPaths(wallet.deriveAddresses, "m/44'/1'/0'");
  });

  it('uses the testnet WIF version byte', () => {
    expect(() =>
      ECPair.fromWIF(wallet.privateKey, bitcoin.networks.bitcoin),
    ).toThrow();
  });
});

describe('addCustomDeriveAddressToWallet("zcash")', () => {
  it('derives an arbitrary path with the native addCustomDerivation shape', async () => {
    const service = load(false);
    const derivePath = "m/44'/133'/1'/0/0";
    const {account} = await service.addCustomDeriveAddressToWallet(
      'zcash',
      ABANDON,
      derivePath,
    );
    expect(Object.keys(account).sort()).toEqual([
      'address',
      'derivePath',
      'privateKey',
    ]);
    expect(account.derivePath).toBe(derivePath);
    expect(account.address).not.toBe(MAINNET_ADDRESS);
    expect(decodeAddress(account.address).prefix).toEqual(MAINNET_P2PKH_PREFIX);
    expect(
      service.zcashChain.createWalletByPrivateKey({
        privateKey: account.privateKey,
      }).address,
    ).toBe(account.address);
  });
});
