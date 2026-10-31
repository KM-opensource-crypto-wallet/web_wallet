import {getSupportId} from 'services/logger';
import {
  getAppName,
  getContactUsEmail,
  isWhiteLabelInfoLoaded,
} from 'whitelabel/whiteLabelInfo';
import {
  buildSupportEmailUrl,
  buildSupportTelegramUrl,
  getSupportTelegramUrl,
} from './contactSupport';

jest.mock('services/logger', () => ({getSupportId: jest.fn()}));
jest.mock('whitelabel/whiteLabelInfo', () => ({
  getAppName: jest.fn(),
  getContactUsEmail: jest.fn(),
  isWhiteLabelInfoLoaded: jest.fn(),
}));
jest.mock('utils/wlData', () => ({WL_APP_NAME: 'Dok Wallet'}));
jest.mock('react-toastify', () => ({toast: {error: jest.fn()}}));

beforeEach(() => {
  isWhiteLabelInfoLoaded.mockReturnValue(true);
  getAppName.mockReturnValue('dokwallet');
  getContactUsEmail.mockReturnValue('support@dokwallet.com');
  getSupportId.mockReturnValue('abc-123');
});

describe('buildSupportEmailUrl', () => {
  it('prefills the subject and the Support ID', () => {
    expect(buildSupportEmailUrl()).toBe(
      'mailto:support@dokwallet.com?subject=Dok%20Wallet%20support&body=Support%20ID%3A%20abc-123%0A%0A',
    );
  });

  it('leaves the body out when there is no Support ID', () => {
    getSupportId.mockReturnValue('');
    expect(buildSupportEmailUrl()).toBe(
      'mailto:support@dokwallet.com?subject=Dok%20Wallet%20support',
    );
  });
});

describe('Telegram', () => {
  it('links the brand support account with the Support ID drafted', () => {
    expect(buildSupportTelegramUrl()).toBe(
      'https://t.me/dokwallet?text=Support%20ID%3A%20abc-123%0A%0A',
    );
    getAppName.mockReturnValue('kimlwallet');
    expect(getSupportTelegramUrl()).toBe('https://t.me/kimlwallet');
  });

  it('offers no Telegram link before the brand is loaded', () => {
    isWhiteLabelInfoLoaded.mockReturnValue(false);
    expect(getSupportTelegramUrl()).toBe('');
    expect(buildSupportTelegramUrl()).toBe('');
  });

  it('offers no Telegram link for other brands', () => {
    getAppName.mockReturnValue('someotherwallet');
    expect(getSupportTelegramUrl()).toBe('');
    expect(buildSupportTelegramUrl()).toBe('');
  });
});
