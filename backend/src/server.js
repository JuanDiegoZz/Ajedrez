import { createServer } from 'node:http';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool();
const port = Number(process.env.PORT || 3000);

createServer(async (request, response) => {
  if (request.method !== 'GET' || request.url !== '/api/health') {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let database = 'available';
  try {
    await pool.query('SELECT 1');
  } catch {
    database = 'unavailable';
  }

  response.writeHead(database === 'available' ? 200 : 503, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify({ backend: 'available', database }));
}).listen(port, '0.0.0.0');

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});
