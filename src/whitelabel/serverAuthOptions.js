import GoogleProvider from 'next-auth/providers/google';
import {getBrandFromHost, getGoogleCredentials} from 'whitelabel/serverBrand';

/**
 * Builds NextAuth options for the brand serving the given request host, so
 * each whitelabel domain signs in with its own Google OAuth client. Pass the
 * host from `x-forwarded-host` ?? `host` (same precedence as layout.js).
 */
export function buildAuthOptions(host) {
  const brand = getBrandFromHost(host);
  const {clientId, clientSecret} = getGoogleCredentials(brand);

  return {
    providers: [
      GoogleProvider({
        clientId,
        clientSecret,
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
    session: {
      strategy: 'jwt',
    },
    callbacks: {
      async jwt({token, account, profile}) {
        // Persist the OAuth access_token and or the refresh_token to the token right after signin
        if (account) {
          token.brand = brand;
          token.accessToken = account.access_token;
          token.refreshToken = account.refresh_token;
          token.expiry = account.expires_at;
        }

        // Ensure picture is persisted
        if (profile) {
          token.picture = profile.picture;
          token.name = profile.name;
          token.email = profile.email;
        }

        // Refresh access token if expired
        if (token.expiry && Date.now() / 1000 > token.expiry) {
          try {
            // Refresh must use the client that issued the token; tokens from
            // before brand tracking have no token.brand and fall back to the
            // request host's brand.
            const creds = getGoogleCredentials(token.brand ?? brand);
            const response = await fetch(
              'https://oauth2.googleapis.com/token',
              {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({
                  client_id: creds.clientId,
                  client_secret: creds.clientSecret,
                  grant_type: 'refresh_token',
                  refresh_token: token.refreshToken,
                }),
              },
            );
            const refreshed = await response.json();
            if (!response.ok) throw refreshed;
            token.accessToken = refreshed.access_token;
            token.expiry = Math.floor(Date.now() / 1000) + refreshed.expires_in;
            if (refreshed.refresh_token) {
              token.refreshToken = refreshed.refresh_token;
            }
          } catch (error) {
            console.error('Token refresh failed:', error);
            token.error = 'RefreshAccessTokenError';
          }
        }

        return token;
      },
      async session({session, token}) {
        // Send properties to the client, like an access_token and user id from a provider.
        session.accessToken = token.accessToken;
        session.error = token.error;

        // Ensure user image is set from token if available
        if (session.user) {
          // Always override with token data to ensure consistency
          session.user.image = token.picture || session.user.image;
          session.user.name = token.name || session.user.name;
          session.user.email = token.email || session.user.email;
        }

        return session;
      },
    },
    secret: process.env.NEXTAUTH_SECRET, // Fallback for dev, but user should set this
    pages: {
      error: '/auth/error', // Error code passed in query string as ?error=
      signIn: '/auth/error',
    },
  };
}
