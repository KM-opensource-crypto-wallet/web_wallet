// In-page stand-ins for the web wallet's Next.js API routes.
//
// The web client calls its own server with relative URLs (fetch('/api/...')).
// In the extension those would hit chrome-extension://<id>/api/..., which
// does not exist, so fetch is wrapped and these paths are answered here, with
// the same request/response contract as the route files in
// web_wallet/src/app/api. The calling code (utils/googleDriveBackup.js) stays
// unchanged.
//
//   /api/drive/backup      POST, DELETE  -> Drive REST, appDataFolder
//   /api/drive/restore     GET           -> Drive REST, appDataFolder
//   /api/drive/backup/key  GET           -> WALLET_BACKUP_SECRET (build time)
//
// /api/bitcoin is handled by the utils/electrumTransport override instead.
import {getGoogleAccessToken} from './googleAuth';

const BACKUP_FILE_NAME = 'wallet_backup_encrypted.json';
const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  });

const authExpired = () =>
  json(
    {error: 'Session expired. Please sign in again.', code: 'AUTH_EXPIRED'},
    401,
  );

class DriveError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const drive = async (url, init = {}) => {
  const token = await getGoogleAccessToken();
  const response = await fetchOriginal(url, {
    ...init,
    headers: {...init.headers, Authorization: `Bearer ${token}`},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new DriveError(
      response.status,
      body?.error?.message || `Drive request failed (${response.status})`,
    );
  }
  return response;
};

const listBackups = async () => {
  const params = new URLSearchParams({
    q: `name = '${BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed = false`,
    spaces: 'appDataFolder',
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc',
  });
  const response = await drive(`${DRIVE}?${params}`);
  return (await response.json()).files || [];
};

const deleteFile = id => drive(`${DRIVE}/${id}`, {method: 'DELETE'});

const createBackup = async fileContent => {
  const boundary = `dok${crypto.randomUUID()}`;
  const metadata = {name: BACKUP_FILE_NAME, parents: ['appDataFolder']};
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json',
    '',
    fileContent,
    `--${boundary}--`,
  ].join('\r\n');
  const response = await drive(
    `${DRIVE_UPLOAD}?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      headers: {'Content-Type': `multipart/related; boundary=${boundary}`},
      body,
    },
  );
  return (await response.json()).id;
};

// Same mapping as the route files: auth problems become AUTH_EXPIRED.
const handleErrors = async fn => {
  try {
    return await fn();
  } catch (error) {
    if (
      error?.code === 'AUTH_EXPIRED' ||
      error?.status === 401 ||
      error?.status === 403
    ) {
      return authExpired();
    }
    return json({error: error?.message || 'Internal Server Error'}, 500);
  }
};

const routes = {
  'POST /api/drive/backup': request =>
    handleErrors(async () => {
      const {fileContent} = await request.json();
      if (!fileContent) {
        return json({error: 'No file content provided'}, 400);
      }
      // Delete-then-create, as the web route does.
      for (const file of await listBackups()) {
        await deleteFile(file.id);
      }
      return json({success: true, fileId: await createBackup(fileContent)});
    }),
  'DELETE /api/drive/backup': () =>
    handleErrors(async () => {
      const files = await listBackups();
      if (!files.length) {
        return json({error: 'No backup file found to delete.'}, 404);
      }
      for (const file of files) {
        await deleteFile(file.id);
      }
      return json({success: true});
    }),
  'GET /api/drive/restore': () =>
    handleErrors(async () => {
      const files = await listBackups();
      if (!files.length) {
        return json({error: 'No backup file found'}, 404);
      }
      const response = await drive(`${DRIVE}/${files[0].id}?alt=media`);
      return json({fileContent: await response.text(), metadata: files[0]});
    }),
  // The web route hands the secret to any signed-in session; the mobile app
  // ships it in its binary. The extension does the same as mobile.
  'GET /api/drive/backup/key': () =>
    handleErrors(async () => {
      await getGoogleAccessToken();
      const secret = process.env.EXT_WALLET_BACKUP_SECRET;
      if (!secret) {
        return json(
          {
            error:
              'Backup is not configured for this build (WALLET_BACKUP_SECRET).',
          },
          500,
        );
      }
      return json({secret});
    }),
};

let fetchOriginal = globalThis.fetch.bind(globalThis);

const normalizePath = pathname =>
  pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;

export const installApiRoutes = () => {
  fetchOriginal = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    // Only inspect URL and method: building a Request for every call would
    // consume streamed bodies meant for the real fetch.
    const href =
      typeof input === 'string' || input instanceof URL
        ? String(input)
        : input.url;
    const url = new URL(href, globalThis.location.href);
    if (url.origin === globalThis.location.origin) {
      const method = (init?.method || input?.method || 'GET').toUpperCase();
      const handler = routes[`${method} ${normalizePath(url.pathname)}`];
      if (handler) {
        return handler(new Request(url, init));
      }
    }
    return fetchOriginal(input, init);
  };
};
