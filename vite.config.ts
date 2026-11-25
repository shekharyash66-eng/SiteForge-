import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

const STATIC_FILES = [
  'index.html',
  'styles.css',
  'app.js',
  'options.js',
  'layouts.js',
  'themes.js',
  'icons.js',
  'validators.js',
  'zip.js',
  'i18n.js',
  'storage.js',
  'qr.js',
  'image-studio.js',
  'health.js',
  'copy-bank.js',
  'selftest.js',
  'features-ui.js',
  'sw.js',
  'manifest.webmanifest',
];

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'siteforge-static-offline-build',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) return;
          const distDir = path.resolve(__dirname, 'dist');
          if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
          }

          const assetsDir = path.join(distDir, 'assets');
          if (fs.existsSync(assetsDir)) {
            fs.rmSync(assetsDir, { recursive: true, force: true });
          }

          for (const file of STATIC_FILES) {
            const src = path.resolve(__dirname, file);
            const dest = path.join(distDir, file);
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dest);
            }
          }

          const iconsSrc = path.resolve(__dirname, 'icons');
          const iconsDest = path.join(distDir, 'icons');
          if (fs.existsSync(iconsSrc)) {
            fs.cpSync(iconsSrc, iconsDest, { recursive: true, force: true });
          }
        },
      },
      {
        name: 'siteforge-raw-css-dev',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const cleanUrl = (req.url || '').split('?')[0];
            if (cleanUrl === '/styles.css') {
              const cssPath = path.resolve(__dirname, 'styles.css');
              if (fs.existsSync(cssPath)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/css; charset=utf-8');
                res.setHeader('Cache-Control', 'no-cache');
                res.end(fs.readFileSync(cssPath));
                return;
              }
            }
            next();
          });
        },
      },
    ],
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
