import {getServerSession} from 'next-auth';
import {headers} from 'next/headers';
import {buildAuthOptions} from 'whitelabel/serverAuthOptions';
import {NextResponse} from 'next/server';

/**
 * GET /api/drive/backup/key
 *
 * Returns the app-wide WALLET_BACKUP_SECRET to an authenticated session.
 * The client mixes it into the backup encryption key together with the
 * user's backup password (`${password}\x00${secret}`), matching the mobile
 * app's v2-gcm format so backups are cross-platform restorable. The mobile
 * app ships this same secret inside its binary; the user's password is the
 * load-bearing secret.
 */
export async function GET() {
  try {
    const headersList = await headers();
    const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
    const session = await getServerSession(buildAuthOptions(host));

    if (!session || !session.user?.email) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const serverSecret = process.env.WALLET_BACKUP_SECRET;
    if (!serverSecret) {
      console.error('WALLET_BACKUP_SECRET is not configured on the server.');
      return NextResponse.json(
        {error: 'Server configuration error'},
        {status: 500},
      );
    }

    return NextResponse.json(
      {secret: serverSecret},
      {headers: {'Cache-Control': 'no-store'}},
    );
  } catch (error) {
    console.error('Backup key error:', error);
    return NextResponse.json(
      {error: 'Failed to fetch backup secret'},
      {status: 500},
    );
  }
}
