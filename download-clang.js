const fs = require('fs');
const https = require('https');
const url = require('url');

const GRAPHQL_URL = 'https://registry.wasmer.io/graphql';
const PACKAGE_NAME = 'clang/clang';
const OUTPUT_FILE = 'clang.webc';

// GraphQL query to get the download URL of the latest version
const query = JSON.stringify({
  query: `
    query {
      getPackageVersion(name: "${PACKAGE_NAME}") {
        version
        distribution {
          downloadUrl
        }
      }
    }
  `
});

console.log(`Querying Wasmer registry for package: "${PACKAGE_NAME}"...`);

// Helper to make a POST request to GraphQL endpoint
const req = https.request({
  hostname: 'registry.wasmer.io',
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': query.length,
    'User-Agent': 'NodeJS-Downloader'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      const packageVersion = response.data.getPackageVersion;
      if (!packageVersion) {
        throw new Error('Package version not found in Wasmer Registry.');
      }
      
      const downloadUrl = packageVersion.distribution.downloadUrl;
      const version = packageVersion.version;
      
      console.log(`Found ${PACKAGE_NAME} version ${version}.`);
      downloadFile(downloadUrl, OUTPUT_FILE);
    } catch (e) {
      console.error('Failed to parse Wasmer Registry API response:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('Wasmer Registry request failed:', e.message);
});

req.write(query);
req.end();

// Helper to download the binary file, following HTTP redirects
function downloadFile(fileUrl, outputPath) {
  console.log(`Downloading compiler image to "${outputPath}"...`);
  const file = fs.createWriteStream(outputPath);

  function get(targetUrl) {
    https.get(targetUrl, {
      headers: { 'User-Agent': 'NodeJS-Downloader' }
    }, (response) => {
      // Follow HTTP redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return get(response.headers.location);
      }

      if (response.statusCode !== 200) {
        console.error(`Download failed. HTTP Status: ${response.statusCode}`);
        file.close();
        fs.unlink(outputPath, () => {});
        return;
      }

      let downloadedBytes = 0;
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        process.stdout.write(`\rDownloaded ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`\nSuccess: Compiler saved as "${outputPath}".`);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(outputPath, () => {});
      console.error(`Download error: ${err.message}`);
    });
  }

  get(fileUrl);
}
