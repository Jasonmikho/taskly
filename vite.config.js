import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    base: '/',
    plugins: [react()],
    optimizeDeps: {
        include: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
                    mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
                    react: ['react', 'react-dom'],
                },
            },
        },
    },
});
