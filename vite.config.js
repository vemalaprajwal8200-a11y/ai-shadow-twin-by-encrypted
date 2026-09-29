import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import chatHandler from './api/chat-handler.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-chat-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/chat', async (req, res) => {
          await chatHandler(req, res)
        })
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
})
