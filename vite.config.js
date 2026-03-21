import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'Assets',
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: 'index.html'
        }
    }
});
