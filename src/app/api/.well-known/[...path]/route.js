// app/api/.well-known/[...path]/route.js
import fs from 'fs';
import path from 'path';
import {NextResponse} from 'next/server';

// Domain to folder mapping - only domains with mobile apps
const DOMAIN_MAPPING = {
  'localhost:3000': 'kimlwallet',
  'dokwallet.app': 'dokwallet',
  'www.dokwallet.app': 'dokwallet',
  'app.dokwallet.com': 'dokwallet',
  'www.app.dokwallet.com': 'dokwallet',
  'kimlview.xyz': 'kimlwallet',
  'www.kimlview.xyz': 'kimlwallet',
  'app.kimlwallet.com': 'kimlwallet',
  'www.app.kimlwallet.com': 'kimlwallet',
};

// Only handle these specific mobile app files
const SUPPORTED_FILES = {
  'apple-app-site-association': 'apple-app-site-association',
  'assetlinks.json': 'assetlinks.json',
};

export async function GET(request, props) {
  const params = await props.params;
  const host = request.headers.get('host');
  console.log('host', host);
  const fileName = params.path.join('/');

  console.log(`[Well-Known] Request: ${host}/.well-known/${fileName}`);

  // Only handle specific mobile app files - reject others immediately
  if (!SUPPORTED_FILES[fileName]) {
    console.log(`[Well-Known] File ${fileName} not handled by this API route`);
    return NextResponse.json(
      {
        error: 'File not handled by mobile app API',
        requested: fileName,
        supported: Object.keys(SUPPORTED_FILES),
        message: 'This API only handles mobile app universal linking files',
      },
      {status: 404},
    );
  }

  // Get whitelabel folder based on domain
  const whitelabelFolder = DOMAIN_MAPPING[host];

  // If domain is not in mapping, it means this whitelabel doesn't have a mobile app
  if (!whitelabelFolder) {
    console.log(`[Well-Known] Domain ${host} not configured for mobile app`);
    return NextResponse.json(
      {
        error: 'Mobile app not available for this domain',
        domain: host,
        message: 'This whitelabel does not support universal linking',
        availableDomains: Object.keys(DOMAIN_MAPPING),
      },
      {status: 404},
    );
  }

  const configFileName = SUPPORTED_FILES[fileName];

  try {
    // Build file path
    const filePath = path.join(
      process.cwd(),
      'src',
      'config',
      'whitelabels',
      whitelabelFolder,
      configFileName,
    );

    console.log(`[Well-Known] Looking for file: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`[Well-Known] File not found: ${filePath}`);
      return NextResponse.json(
        {
          error: 'Configuration file not found',
          path: `config/whitelabels/${whitelabelFolder}/${configFileName}`,
          message: 'Please create the configuration file for this whitelabel',
          whitelabel: whitelabelFolder,
        },
        {status: 404},
      );
    }

    // Read and parse file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonContent = JSON.parse(fileContent);

    console.log(
      `[Well-Known] Successfully served ${configFileName} for ${whitelabelFolder}`,
    );

    // Set appropriate headers
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
    };

    // Add debug headers in development
    if (process.env.NODE_ENV === 'development') {
      headers['X-Whitelabel-Config'] = whitelabelFolder;
      headers['X-Config-File'] = configFileName;
      headers['X-Requested-File'] = fileName;
    }

    // Return the configuration
    return NextResponse.json(jsonContent, {headers});
  } catch (error) {
    console.error(`[Well-Known] Error serving file:`, error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        whitelabel: whitelabelFolder,
        file: configFileName,
      },
      {status: 500},
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
