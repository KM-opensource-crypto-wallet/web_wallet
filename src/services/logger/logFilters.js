// Pure predicates used by beforeSendLog / beforeBreadcrumb to drop console
// output that scripts other than the app wrote to the page's console.
// Isomorphic: no window, no SDK.
//
// consoleLoggingIntegration patches the page's main-world `console`. Extension
// content scripts run in an isolated world with their own console and never
// reach it; scripts an extension or in-app browser injects INTO the page do.
// The SDK records a log synchronously inside the console call, so a stack
// taken in beforeSendLog still shows the script that logged.
//
// As in eventFilters.js, never drop on missing data: a stack that cannot be
// read keeps the log.
import {EXTENSION_FRAME} from './eventFilters';

// Injected code with no script URL to recognise. Grow from real dashboard
// noise; anchor each pattern so app messages cannot match by accident.
export const FOREIGN_LOG_MESSAGES = [
  // Facebook / Instagram in-app browser paint timings (evaluateJavaScript).
  /^FBNav[A-Za-z]+:\d+$/,
  // A page-resource scanning extension; logs with a %c style argument.
  /^%c\[ResourceDetector\]/,
];

// `at fn (url:1:2)` / `at url:1:2` (V8) and `fn@url:1:2` (Firefox, Safari).
const STACK_LINE_URL =
  /(?:\(|@|\bat )([a-z][\w+.-]*:\/\/?[^\s()]*?):\d+(?::\d+)?\)?\s*$/i;

// The outermost frame: where the synchronous call that logged began. An
// extension wrapping console sits mid-stack, so an app log keeps an app origin.
export const originatingScriptUrl = stack => {
  if (typeof stack !== 'string') {
    return null;
  }
  const lines = stack.split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const match = STACK_LINE_URL.exec(lines[i].trim());
    if (match) {
      return match[1];
    }
  }
  return null;
};

export const isForeignLog = (message, stack) => {
  if (
    typeof message === 'string' &&
    FOREIGN_LOG_MESSAGES.some(pattern => pattern.test(message))
  ) {
    return true;
  }
  const origin = originatingScriptUrl(stack);
  return origin != null && EXTENSION_FRAME.test(origin);
};

// V8 keeps 10 frames by default; the SDK's own frames would push the origin
// out of a deep call, so widen the limit just for this capture.
const CALLER_STACK_LIMIT = 100;

export const captureCallerStack = () => {
  const previousLimit = Error.stackTraceLimit;
  try {
    if (typeof previousLimit === 'number') {
      Error.stackTraceLimit = CALLER_STACK_LIMIT;
    }
    return new Error().stack;
  } catch {
    return null;
  } finally {
    if (typeof previousLimit === 'number') {
      Error.stackTraceLimit = previousLimit;
    }
  }
};
