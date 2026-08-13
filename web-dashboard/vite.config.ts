import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['coffee-icon.svg'],
        manifest: {
            name: 'Singgah Coffee POS',
            short_name: 'Singgah POS',
            description: 'POS System for Singgah Coffee',
            theme_color: '#4B3621',
            background_color: '#F5F0E6',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/',
            scope: '/',
            icons: [
                {
                    src: '/coffee-icon.svg',
                    sizes: 'any',
                    type: 'image/svg+xml',
                    purpose: 'any'
                }
            ]
        },
        workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
            cleanupOutdatedCaches: true,
            runtimeCaching: [
                {
                    urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
                    handler: 'NetworkFirst',
                    options: {
                        cacheName: 'api-cache',
                        expiration: { maxEntries: 50, maxAgeSeconds: 300 },
                    },
                },
            ],
        }
    })],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 3000,
        proxy: {
            '/api': {
                target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
                changeOrigin: true,
            },
            '/uploads': {
                target: process.env.VITE_PROXY_TARGET || 'http://localhost:8080',
                changeOrigin: true,
            },
        },
        watch: {
            usePolling: true,
        },
    },
})
