import {isMalformedRequestError} from './requestFilters';

// Shaped like the requests behind the DOKWALLET-WALLET-WEB-* events: Next
// hands onRequestError a plain object whose header keys are lower-case.
const post = (headers = {}) => ({method: 'POST', path: '/settings/', headers});
const get = (headers = {}) => ({
  method: 'GET',
  path: '/wallet/1/home/',
  headers,
});

describe('isMalformedRequestError', () => {
  it.each([
    [
      'multipart POST without a boundary (10, 1H)',
      'Failed to parse body as FormData.',
    ],
    ['reply stream closed mid-chunk (1K)', 'Connection closed.'],
    ['forged Blob reference (1M)', 'Referenced Blob is not a Blob.'],
    ['forged forward reference (1P)', 'Invalid forward reference.'],
    ['forged reference (1Q)', 'Invalid reference.'],
    ['re-initialised Map', 'Already initialized Map.'],
    ['bad Set initializer', 'Invalid Set initializer.'],
    ['truncated multipart body', 'Unexpected end of form'],
    [
      'nested-array bomb',
      'Maximum array nesting exceeded. Large nested arrays can be dangerous. Try adding intermediate objects.',
    ],
  ])('drops a POST whose body failed to decode: %s', (_, message) => {
    expect(isMalformedRequestError(new Error(message), post())).toBe(true);
  });

  it('keeps the same messages on a GET, which carries no body to blame', () => {
    expect(
      isMalformedRequestError(new Error('Connection closed.'), get()),
    ).toBe(false);
    expect(
      isMalformedRequestError(new Error('Invalid reference.'), get()),
    ).toBe(false);
  });

  it('drops a router-state header Next could not parse, on any method (J)', () => {
    const error = new Error(
      'The router state header was sent but could not be parsed.',
    );
    expect(isMalformedRequestError(error, get())).toBe(true);
    expect(isMalformedRequestError(error, post())).toBe(true);
  });

  describe("Next's Server Action CSRF check (1D)", () => {
    const csrf = new Error('Invalid Server Actions request.');

    it('drops a post whose Origin is another site', () => {
      expect(
        isMalformedRequestError(
          csrf,
          post({
            origin: 'https://scanner.example',
            'x-forwarded-host': 'app.kimlwallet.com',
          }),
        ),
      ).toBe(true);
      expect(
        isMalformedRequestError(
          csrf,
          post({origin: 'https://scanner.example', host: 'app.kimlwallet.com'}),
        ),
      ).toBe(true);
    });

    it('keeps a port-only mismatch: a brand proxy misconfiguration that breaks real users', () => {
      expect(
        isMalformedRequestError(
          csrf,
          post({
            origin: 'https://app.kimlwallet.com',
            'x-forwarded-host': 'app.kimlwallet.com:443',
          }),
        ),
      ).toBe(false);
    });

    it('compares against the first forwarded host, case-insensitively', () => {
      expect(
        isMalformedRequestError(
          csrf,
          post({
            origin: 'https://Brand.example',
            'x-forwarded-host': 'brand.example, internal.lb',
          }),
        ),
      ).toBe(false);
    });

    it('keeps it when the Origin or the host is unknown', () => {
      expect(
        isMalformedRequestError(
          csrf,
          post({'x-forwarded-host': 'app.kimlwallet.com'}),
        ),
      ).toBe(false);
      expect(
        isMalformedRequestError(
          csrf,
          post({origin: 'https://scanner.example'}),
        ),
      ).toBe(false);
      expect(
        isMalformedRequestError(
          csrf,
          post({origin: 'null', host: 'app.kimlwallet.com'}),
        ),
      ).toBe(false);
    });
  });

  it('keeps every other error', () => {
    expect(
      isMalformedRequestError(
        new TypeError("Cannot read properties of undefined (reading 'x')"),
        post(),
      ),
    ).toBe(false);
    expect(
      isMalformedRequestError(
        new SyntaxError('Unexpected token \'e\', "en" is not valid JSON'),
        post(),
      ),
    ).toBe(false);
    expect(isMalformedRequestError(undefined, post())).toBe(false);
    expect(isMalformedRequestError(new Error('Connection closed.'))).toBe(
      false,
    );
  });
});
