// Firebase Functions (v2) entry point for the OmniHealth backend.
//
// The Express app itself lives in ../backend/index.js and is bundled to
// dist/ by `npm run build` (esbuild, CommonJS) together with the shared/
// parser, filter and classifier modules — one source of truth, no copies.
//
// dist/ is bundled as CommonJS on purpose: a plain require() then works on
// every supported Node runtime (18/20/22), no require(esm) needed.
const { onRequest } = require('firebase-functions/v2/https');

const { app } = require('./dist/backend/index.js');

// Exposed URL after deploy:
//   https://omnihealthapi-<hash>-<region>.a.run.app
// Set this as VITE_API_BASE in the Vercel project settings.
exports.omnihealthApi = onRequest(
  {
    region: 'asia-south1', // Mumbai — closest region to India for the demo
    memory: '512MiB',
    maxInstances: 10, // cap cost on the Blaze plan
    concurrency: 80,
  },
  app
);
