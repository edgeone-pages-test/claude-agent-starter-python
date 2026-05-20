import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // @tencent/edgeone 是后端/部署依赖，前端不需要预优化
  optimizeDeps: {
    exclude: ['@tencent/edgeone'],
  },
  server: {
    port: 5173,
    headers: {
      'Connection': 'keep-alive',
    },
  },
})
