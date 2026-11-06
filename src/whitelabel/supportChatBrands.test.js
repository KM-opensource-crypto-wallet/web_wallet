/**
 * @jest-environment jsdom
 */
jest.mock('dok-wallet-blockchain-networks/config/dokApi', () => ({
  DokApi: {},
  setWhiteLabelIdToDokApi: jest.fn(),
}));
jest.mock('utils/apiCaptcha', () => ({setupWebCaptchaInterceptor: jest.fn()}));
jest.mock('services/logger', () => ({attachDokApiLogging: jest.fn()}));

const wl = require('./whiteLabelInfo');

describe('isSupportChatBrand', () => {
  it('is false before white label info loads', () => {
    expect(wl.isSupportChatBrand()).toBe(false);
  });

  it.each([
    ['Dok Wallet', wl.DOK_WALLET_ID, true],
    ['KIML Wallet', wl.KIML_WALLET_ID, true],
    ['other white label', '656ef5754f6f203ba7fccf45', false],
  ])('%s -> %p', (_name, id, expected) => {
    wl.setWhiteLabelInfo({_id: id});
    expect(wl.isSupportChatBrand()).toBe(expected);
  });
});
