// reCAPTCHA bridge for the browser extension.
//
// An extension page cannot load reCAPTCHA (remote script, and the site key is
// bound to web domains), so the extension embeds this page in a hidden iframe
// and asks it for tokens over postMessage. The token is issued for this
// domain, so the backend verifies it exactly like a web wallet token.
//
// Only the extension ids listed in EXT_CAPTCHA_ALLOWED_ORIGINS may embed the
// page (frame-ancestors) or get a reply (origin check). Without that variable
// the route answers 404.
//   EXT_CAPTCHA_ALLOWED_ORIGINS=chrome-extension://<id>,chrome-extension://<id>
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;

const allowedOrigins = () =>
  (process.env.EXT_CAPTCHA_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => EXTENSION_ORIGIN.test(origin));

// JSON inside a <script>: escape `<` so a value can never close the tag.
const toScriptValue = value => JSON.stringify(value).replace(/</g, '\\u003c');

const renderPage = (siteKey, origins) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <script src="https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(
      siteKey,
    )}"></script>
    <script>
      (function () {
        var SITE_KEY = ${toScriptValue(siteKey)};
        var ALLOWED = ${toScriptValue(origins)};
        var ACTION = /^[A-Za-z0-9_/]{1,100}$/;

        window.addEventListener('message', function (event) {
          if (ALLOWED.indexOf(event.origin) === -1) return;
          var data = event.data || {};
          if (data.type !== 'captcha:execute' || typeof data.id !== 'string') {
            return;
          }
          var reply = function (result) {
            result.type = 'captcha:result';
            result.id = data.id;
            event.source.postMessage(result, event.origin);
          };
          if (!ACTION.test(data.action) || !window.grecaptcha) {
            reply({error: window.grecaptcha ? 'invalid action' : 'reCAPTCHA not loaded'});
            return;
          }
          grecaptcha.ready(function () {
            grecaptcha.execute(SITE_KEY, {action: data.action}).then(
              function (token) { reply({token: token}); },
              function (err) { reply({error: String((err && err.message) || err)}); }
            );
          });
        });

        // Tell the extension it can start asking. postMessage drops the
        // message for every origin that is not the actual parent.
        var announce = function () {
          ALLOWED.forEach(function (origin) {
            window.parent.postMessage({type: 'captcha:ready'}, origin);
          });
        };
        if (window.grecaptcha) {
          grecaptcha.ready(announce);
        } else {
          window.addEventListener('load', function () {
            if (window.grecaptcha) grecaptcha.ready(announce);
          });
        }
      })();
    </script>
  </head>
  <body></body>
</html>
`;

export async function GET() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const origins = allowedOrigins();
  if (!siteKey || !origins.length) {
    return new Response('Not found', {status: 404});
  }
  return new Response(renderPage(siteKey, origins), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': `frame-ancestors ${origins.join(' ')}`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
