import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'dist',
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            input: 'index.html',
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('framer-motion') || id.includes('motion')) {
                            return 'vendor-react';
                        }
                        if (id.includes('@phosphor-icons') || id.includes('lucide-react')) {
                            return 'vendor-icons';
                        }
                        if (id.includes('zustand') || id.includes('axios')) {
                            return 'vendor-core';
                        }
                    }
                }
            }
        }
    }
});
