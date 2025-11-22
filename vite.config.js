import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键修改：添加 base 属性，值必须是 '/仓库名/'
  base: '/my-dashboard/',
  
  // 下面是可选的优化配置，帮你消除打包时的黄色警告
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})