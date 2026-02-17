import { defineConfig } from 'vite'
import { copyFileSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' with { type: 'json' }
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [vue(),     
    AutoImport({
    resolvers: [ElementPlusResolver()],
  }),
  Components({
    resolvers: [ElementPlusResolver()],
  }),
  crx({ manifest }),
    {
      name: 'popup-static-overwrite',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist')
        copyFileSync(resolve(__dirname, 'public/popup.html'), resolve(distDir, 'popup.html'))
        copyFileSync(resolve(__dirname, 'public/popup.js'), resolve(distDir, 'popup.js'))
        const manifestPath = resolve(distDir, 'manifest.json')
        let manifestData
        if (existsSync(manifestPath)) {
          manifestData = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        } else {
          manifestData = { ...manifest }
        }
        if (manifestData.action) manifestData.action.default_popup = 'popup.html'
        writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2))
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        index: 'index.html',
      },
      output: {
        manualChunks: {
          'element-plus': ['element-plus'],
          'element-icons': ['@element-plus/icons-vue'],
        },
      },
    },
  },
})
