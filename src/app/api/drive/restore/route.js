import {getServerSession} from 'next-auth';
import {google} from 'googleapis';
import {NextResponse} from 'next/server';
import {authOptions} from '../../auth/[...nextauth]/route';

const BACKUP_FILE_NAME = 'wallet_backup_encrypted.json';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({access_token: session.accessToken});

    const drive = google.drive({version: 'v3', auth});

    // 1. Find the backup file
    const listRes = await drive.files.list({
      q: `name = '${BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed = false`,
      spaces: 'appDataFolder',
      fields: 'files(id, name, modifiedTime)',
    });

    const files = listRes.data.files || [];
    if (files.length === 0) {
      return NextResponse.json({error: 'No backup file found'}, {status: 404});
    }

    // Use the most recent file if multiples exist (though backup logic tries to keep one)
    const fileId = files[0].id;

    // 2. Download content
    const getRes = await drive.files.get(
      {fileId: fileId, alt: 'media'},
      {responseType: 'text'}, // Get as text directly
    );

    return NextResponse.json({
      fileContent: getRes.data,
      metadata: files[0],
    });
  } catch (error) {
    console.error('Restore API Error:', error);

    // Check for auth errors
    if (
      error.code === 401 ||
      error.code === 403 ||
      error.message?.includes('invalid authentication credentials')
    ) {
      return NextResponse.json(
        {error: 'Session expired. Please sign in again.', code: 'AUTH_EXPIRED'},
        {status: 401},
      );
    }

    return NextResponse.json(
      {error: error.message || 'Internal Server Error'},
      {status: 500},
    );
  }
}
