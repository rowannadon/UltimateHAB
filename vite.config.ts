import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import dsv from '@rollup/plugin-dsv'

export default defineConfig({
  plugins: [react(), dsv()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {

      '/api': {
        target: 'https://api.v2.sondehub.org/tawhiri',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }
  }
})
