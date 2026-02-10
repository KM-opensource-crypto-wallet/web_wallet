import {getServerSession} from 'next-auth';
import {createHmac} from 'crypto';
import {authOptions} from '../../../auth/[...nextauth]/route';
import {NextResponse} from 'next/server';

/**
 * GET /api/drive/backup/key
 *
 * Returns a per-user encryption key derived via HMAC-SHA256
 * from a server-only secret and the authenticated user's email.
 * The key never leaves server memory except as the response to
 * an authenticated request.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

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

    // Derive a per-user key: HMAC-SHA256(serverSecret, userEmail)
    const hmac = createHmac('sha256', serverSecret);
    hmac.update(session.user.email);
    const perUserKey = hmac.digest('hex');

    return NextResponse.json({key: perUserKey});
  } catch (error) {
    console.error('Key derivation error:', error);
    return NextResponse.json(
      {error: 'Failed to derive encryption key'},
      {status: 500},
    );
  }
}
