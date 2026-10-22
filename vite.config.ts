import { defineConfig } from 'vite';
export default defineConfig({ base: '/', build: { target: 'es2022' }, server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**'] } } });
