import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.DOK_WALLET_GOOGLE_WEB_CLIENT_ID,
      clientSecret: process.env.DOK_WALLET_GOOGLE_WEB_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            'openid email profile https://www.googleapis.com/auth/drive.appdata',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({token, account, profile}) {
      // Persist the OAuth access_token and or the refresh_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiry = account.expires_at;
        console.log('NextAuth: Account data saved to token');
      }

      // Ensure picture is persisted
      if (profile) {
        console.log(
          'NextAuth: Profile received',
          profile.email,
          !!profile.picture,
        );
        token.picture = profile.picture;
      }

      return token;
    },
    async session({session, token}) {
      // Send properties to the client, like an access_token and user id from a provider.
      session.accessToken = token.accessToken;
      session.error = token.error;

      // Ensure user image is set from token if available
      if (session.user && token.picture) {
        session.user.image = token.picture;
        console.log('NextAuth: Session user image set from token');
      } else if (session.user) {
        console.log(
          'NextAuth: Session user image not found in token',
          !!token.picture,
        );
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'changeme', // Fallback for dev, but user should set this
  pages: {
    error: '/auth/error', // Error code passed in query string as ?error=
    signIn: '/auth/error',
  },
};

const handler = NextAuth(authOptions);

export {handler as GET, handler as POST, authOptions};
