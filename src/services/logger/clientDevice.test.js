import {
  describeClientDevice,
  deviceAttributes,
  refineClientDevice,
} from './clientDevice';

const UA = {
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  firefoxWin:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
  edgeWin:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.2651.74',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
  chromeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/127.0.6533.77 Mobile/15E148 Safari/604.1',
  chromeLinux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
};

describe('describeClientDevice', () => {
  it.each([
    ['Chrome on macOS', UA.chromeMac, 'Chrome', '128', 'macOS', '10.15.7'],
    ['Safari on iOS', UA.safariIos, 'Safari', '17.4', 'iOS', '17.4'],
    ['Safari on macOS', UA.safariMac, 'Safari', '17.5', 'macOS', '10.15.7'],
    ['Firefox on Windows', UA.firefoxWin, 'Firefox', '128', 'Windows', '10'],
    ['Edge on Windows', UA.edgeWin, 'Edge', '127', 'Windows', '10'],
    ['Chrome on Android', UA.chromeAndroid, 'Chrome', '127', 'Android', '14'],
    ['Chrome on iOS', UA.chromeIos, 'Chrome', '127', 'iOS', '17.4'],
    ['Chrome on Linux', UA.chromeLinux, 'Chrome', '127', 'Linux', undefined],
  ])('parses %s from the user agent', (_label, userAgent, bn, bv, on, ov) => {
    expect(describeClientDevice({userAgent})).toEqual({
      browser: {name: bn, version: bv},
      os: {name: on, version: ov},
    });
  });

  it('prefers Client Hints brands and platform when present', () => {
    const device = describeClientDevice({
      userAgent: UA.edgeWin,
      userAgentData: {
        platform: 'Windows',
        brands: [
          {brand: 'Not A(Brand', version: '99'},
          {brand: 'Chromium', version: '127'},
          {brand: 'Microsoft Edge', version: '127'},
        ],
      },
    });
    expect(device.browser).toEqual({name: 'Edge', version: '127'});
    expect(device.os).toEqual({name: 'Windows', version: '10'});
  });

  it('leaves unknown parts undefined and never throws', () => {
    expect(describeClientDevice({userAgent: 'curl/8.4.0'})).toEqual({
      browser: {name: undefined, version: undefined},
      os: {name: undefined, version: undefined},
    });
    expect(describeClientDevice(undefined)).toEqual({
      browser: {name: undefined, version: undefined},
      os: {name: undefined, version: undefined},
    });
  });
});

describe('refineClientDevice', () => {
  it('upgrades Windows 10 to 11 and takes the full browser version', async () => {
    const device = await refineClientDevice({
      userAgent: UA.edgeWin,
      userAgentData: {
        platform: 'Windows',
        brands: [{brand: 'Microsoft Edge', version: '127'}],
        getHighEntropyValues: jest.fn().mockResolvedValue({
          platformVersion: '15.0.0',
          fullVersionList: [
            {brand: 'Chromium', version: '127.0.6533.74'},
            {brand: 'Microsoft Edge', version: '127.0.2651.74'},
          ],
        }),
      },
    });
    expect(device).toEqual({
      browser: {name: 'Edge', version: '127.0.2651.74'},
      os: {name: 'Windows', version: '11'},
    });
  });

  it('reports the macOS version from platformVersion', async () => {
    const device = await refineClientDevice({
      userAgent: UA.chromeMac,
      userAgentData: {
        platform: 'macOS',
        brands: [{brand: 'Google Chrome', version: '128'}],
        getHighEntropyValues: jest
          .fn()
          .mockResolvedValue({platformVersion: '14.5.0', fullVersionList: []}),
      },
    });
    expect(device.os).toEqual({name: 'macOS', version: '14.5.0'});
    expect(device.browser).toEqual({name: 'Chrome', version: '128'});
  });

  it('resolves null without Client Hints or when the browser refuses', async () => {
    await expect(
      refineClientDevice({userAgent: UA.safariMac}),
    ).resolves.toBeNull();
    await expect(
      refineClientDevice({
        userAgentData: {
          platform: 'Windows',
          brands: [],
          getHighEntropyValues: jest
            .fn()
            .mockRejectedValue(new Error('denied')),
        },
      }),
    ).resolves.toBeNull();
  });
});

describe('deviceAttributes', () => {
  it('flattens to the Sentry conventional keys and drops unknowns', () => {
    expect(
      deviceAttributes({
        browser: {name: 'Safari', version: '17.4'},
        os: {name: 'iOS', version: undefined},
      }),
    ).toEqual({
      'browser.name': 'Safari',
      'browser.version': '17.4',
      'os.name': 'iOS',
    });
  });
});
