// db-server.js

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import jsonServer from 'json-server';
const server = jsonServer.create()
const router = jsonServer.router(path.resolve(__dirname, process.env['DB_FILE']));
const middlewares = jsonServer.defaults()

server.use(middlewares)
server.use(router)

server.listen(5006, () => {
  console.log('JSON Server is running on Port 5006')
})

// Handle graceful shutdown
const shutdown = () => {
  server.close(() => {
      console.log('Server closed');
      process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);