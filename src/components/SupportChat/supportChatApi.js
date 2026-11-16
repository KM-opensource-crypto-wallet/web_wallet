import {DokApi} from 'dok-wallet-blockchain-networks/config/dokApi';

const URL_PATH = '/support-chat';
const ANSWER_OUTCOMES = ['answered', 'not_covered', 'secret_blocked'];

// Every HTTP status resolves (validateStatus) so expected 4xx/503 replies are
// not reported as failed requests. The widget's own AbortController is the only
// timer, so axios's timeout is switched off.
const options = signal => ({
  signal,
  timeout: 0,
  validateStatus: () => true,
});

const hasToken = config => Boolean(config?.headers?.['x-captcha-token']);

const toResult = response => ({
  status: response.status,
  body: response.data,
  tokenSent: hasToken(response.config),
});

const toFailure = (error, signal) => {
  if (signal?.aborted || error?.code === 'ERR_CANCELED') {
    return {aborted: true};
  }
  return {status: null, body: null, tokenSent: hasToken(error?.config)};
};

// `path` is a route pattern such as /wallet/[clientId]/swap, never real ids.
export const getStarters = async (signal, path) => {
  try {
    return toResult(
      await DokApi.get(URL_PATH, {
        ...options(signal),
        params: path ? {v: 1, path} : {v: 1},
      }),
    );
  } catch (error) {
    return toFailure(error, signal);
  }
};

export const send = async (body, signal) => {
  try {
    return toResult(await DokApi.post(URL_PATH, body, options(signal)));
  } catch (error) {
    return toFailure(error, signal);
  }
};

const isV1 = body => body !== null && typeof body === 'object' && body.v === 1;

const defaultOnline = () =>
  typeof navigator === 'undefined' || navigator.onLine !== false;

const isCaptchaText = body => {
  try {
    return /captcha/i.test(
      typeof body === 'string' ? body : JSON.stringify(body ?? ''),
    );
  } catch {
    return false;
  }
};

/**
 * Pure. Returns 'ok' | 'hide' | 'invalid' | 'rate_limited' | 'busy' |
 * 'captcha' | 'offline' | 'unavailable'. The first matching row wins.
 */
export const mapResponse = ({
  status,
  body,
  tokenSent,
  online = defaultOnline(),
  kind = 'answer',
}) => {
  const v1 = isV1(body);
  if (status === 200 && v1) {
    const valid =
      kind === 'starters'
        ? Array.isArray(body.starters)
        : ANSWER_OUTCOMES.includes(body.outcome);
    return valid ? 'ok' : 'unavailable';
  }
  if (status === 404 && v1 && body.code === 'disabled') return 'hide';
  if (status === 400 && v1 && body.code === 'invalid') return 'invalid';
  if (status === 429 && v1 && body.code === 'rate_limited') {
    return 'rate_limited';
  }
  if (status === 503 && v1 && body.code === 'busy') return 'busy';
  if (
    (status === 401 || status === 403) &&
    !v1 &&
    (!tokenSent || isCaptchaText(body))
  ) {
    return 'captcha';
  }
  if (status === null && online === false) return 'offline';
  return 'unavailable';
};
