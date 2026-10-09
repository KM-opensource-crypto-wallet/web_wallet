// `next/headers` has no meaning without a server. Only server files import it
// and the extension overrides or skips those; reaching this is a bug.
const unavailable = name => () => {
  throw new Error(`next/headers ${name}() is not available in the extension`);
};

export const headers = unavailable('headers');
export const cookies = unavailable('cookies');
export const draftMode = unavailable('draftMode');
