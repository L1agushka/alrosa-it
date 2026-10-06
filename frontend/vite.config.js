import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // в режиме npm run dev запросы /api уходят на бэкенд (порт 8000)
  server: { proxy: { '/api': 'http://localhost:8000' } },
})
