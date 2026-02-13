import {getServerSession} from 'next-auth';
import {google} from 'googleapis';
import {authOptions} from '../../auth/[...nextauth]/route';
import {NextResponse} from 'next/server';

const BACKUP_FILE_NAME = 'wallet_backup_encrypted.json';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const {fileContent} = await req.json();

    if (!fileContent) {
      return NextResponse.json(
        {error: 'No file content provided'},
        {status: 400},
      );
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({access_token: session.accessToken});

    const drive = google.drive({version: 'v3', auth});

    // 1. List files to see if a backup already exists
    const listRes = await drive.files.list({
      q: `name = '${BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed = false`,
      spaces: 'appDataFolder',
      fields: 'files(id, name)',
    });

    const existingFiles = listRes.data.files || [];

    // 2. Delete existing files
    for (const file of existingFiles) {
      await drive.files.delete({fileId: file.id});
    }

    // 3. Upload new file
    const fileMetadata = {
      name: BACKUP_FILE_NAME,
      parents: ['appDataFolder'],
    };

    const media = {
      mimeType: 'application/json',
      body: fileContent,
    };

    const createRes = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    return NextResponse.json({success: true, fileId: createRes.data.id});
  } catch (error) {
    console.error('Backup API Error:', error);
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
