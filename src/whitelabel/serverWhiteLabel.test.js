import {
  getWhiteLabelForHost,
  hostFromHeaderValue,
  rememberWhiteLabelForHost,
  tagRequestScope,
} from './serverWhiteLabel';
import {setWhiteLabelContext} from 'services/logger';

jest.mock('services/logger', () => ({setWhiteLabelContext: jest.fn()}));

const request = headers => ({
  headers: {get: name => headers[name.toLowerCase()] ?? null},
});

beforeEach(() => jest.clearAllMocks());

describe('hostFromHeaderValue', () => {
  it('strips the port, lowercases and tolerates missing values', () => {
    expect(hostFromHeaderValue('KimlView.xyz:3000')).toBe('kimlview.xyz');
    expect(hostFromHeaderValue(undefined)).toBe('');
    expect(hostFromHeaderValue(null)).toBe('');
  });
});

describe('whitelabel-by-host cache', () => {
  it('returns what the layout learned from the backend for that host', () => {
    rememberWhiteLabelForHost('app.newbrand.io', {
      _id: 'abc123',
      name: 'New Brand',
      title: 'irrelevant',
    });
    expect(getWhiteLabelForHost('APP.NEWBRAND.IO:443')).toEqual({
      name: 'New Brand',
      id: 'abc123',
    });
  });

  it('knows nothing about hosts it has not seen and ignores junk', () => {
    rememberWhiteLabelForHost('junk.example', undefined);
    rememberWhiteLabelForHost('', {_id: 'x', name: 'y'});
    expect(getWhiteLabelForHost('junk.example')).toBeNull();
    expect(getWhiteLabelForHost('never-seen.example')).toBeNull();
    expect(getWhiteLabelForHost(undefined)).toBeNull();
  });
});

describe('tagRequestScope', () => {
  it('tags host plus the brand learned for that host, preferring x-forwarded-host', () => {
    rememberWhiteLabelForHost('wallet.eight.example', {
      _id: 'id8',
      name: 'Eight',
    });
    tagRequestScope(
      request({
        'x-forwarded-host': 'wallet.eight.example',
        host: 'localhost:3000',
      }),
    );
    expect(setWhiteLabelContext).toHaveBeenCalledWith({
      host: 'wallet.eight.example',
      name: 'Eight',
      id: 'id8',
    });
  });

  it('never guesses a brand for an unknown host', () => {
    tagRequestScope(request({host: 'unknown.example'}));
    expect(setWhiteLabelContext).toHaveBeenCalledWith({
      host: 'unknown.example',
      name: undefined,
      id: undefined,
    });
  });
});
