import { exec } from 'node:child_process';
import { createServer as createViteServer } from 'vite';
import { app } from './index.js';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 43127);
const url = `http://${host}:${port}/ai-options-story/`;

const vite = await createViteServer({
  server: {
    middlewareMode: true,
  },
  appType: 'spa',
});

app.use(vite.middlewares);

const server = app.listen(port, host, () => {
  console.log(`App and database API listening on ${url}`);
  console.log('Press Ctrl+C to stop.');
  exec(`start "" "${url}"`);
});

server.on('error', (error) => {
  console.error('Failed to start app:', error);
  process.exitCode = 1;
});
