import NextAuth from 'next-auth';
import {buildAuthOptions} from 'whitelabel/serverAuthOptions';

async function handler(req, ctx) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  return NextAuth(req, ctx, buildAuthOptions(host));
}

export {handler as GET, handler as POST};
