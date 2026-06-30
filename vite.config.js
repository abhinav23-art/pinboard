import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    port: 3000,
    open: true,
    host: true
  },
  plugins: [
    {
      name: 'tracks-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // 1. API route to save track list back to js/track-list.js on disk
          if (req.url === '/api/tracks' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const tracks = JSON.parse(body);
                const filePath = path.resolve(__dirname, 'js/track-list.js');
                const fileContent = `export const trackList = ${JSON.stringify(tracks, null, 2)};\n`;
                fs.writeFileSync(filePath, fileContent, 'utf-8');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
              }
            });
          }
          // 2. API route to upload raw binary audio files to public/asset/
          else if (req.url.startsWith('/api/upload') && req.method === 'POST') {
            try {
              const url = new URL(req.url, 'http://localhost');
              const rawName = url.searchParams.get('name') || 'uploaded.mp3';
              
              // Clean filename to prevent path traversal and make it look nice
              const cleanName = rawName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
              const targetPath = path.resolve(__dirname, 'public/asset', cleanName);
              
              // Ensure directory exists
              const dir = path.dirname(targetPath);
              if (!fs.existsSync(dir)){
                fs.mkdirSync(dir, { recursive: true });
              }

              const fileStream = fs.createWriteStream(targetPath);
              req.pipe(fileStream);
              
              req.on('end', () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, path: `/asset/${cleanName}` }));
              });
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  build: {
    outDir: 'dist'
  }
});
