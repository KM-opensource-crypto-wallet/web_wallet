import cases from './__fixtures__/secret-cases.json';
import {findSecret} from './secretDetector';

// Same fixture, same expectations as the backend's secretDetector test.
describe('findSecret fixture parity', () => {
  test.each(cases)('$name', ({text, expected}) => {
    expect(findSecret(text)).toBe(expected);
  });
});
