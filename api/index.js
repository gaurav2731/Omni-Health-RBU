// Vercel serverless function: mounts the real Express backend
// (backend/index.js) under the /api/* catch-all route. Same origin as the
// frontend, so CORS is a non-issue in production and the AI bot gets live
// hospital suggestions on the deployed site.
//
// Vercel serves the FULL original path (/api/hospitals), while the Express
// app defines its routes without the /api prefix — strip it before
// dispatching to the Express stack.
import { app } from '../backend/index.js';

export default function handler(req, res) {
  req.url = req.url ? req.url.replace(/^\/api(?=\/|$)/, '') || '/' : '/';
  return app(req, res);
}
