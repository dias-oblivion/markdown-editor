import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // O app só roda no Chromium do Electron 40 (Chromium 138); mirar nele evita
    // transpilação/polyfills de features já suportadas, gerando código menor.
    target: 'chrome138',
    // Os chunks do Mermaid são grandes por natureza e já são carregados sob
    // demanda — o aviso padrão de 500 kB não agrega aqui.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Separa vendors estáveis (raramente mudam) do código do app. Cuidado: só
        // agrupamos o CORE do CodeMirror — os pacotes de linguagem (@codemirror/lang-*
        // e @lezer/<lang>) são carregados sob demanda pelo language-data e precisam
        // ficar em chunks dinâmicos próprios; agrupá-los aqui os tornaria eager.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || /[\\/]react[\\/]/.test(id) || id.includes('react/jsx-runtime') || id.includes('/scheduler/')) {
            return 'vendor-react';
          }
          const CM_CORE = [
            '@codemirror/view', '@codemirror/state', '@codemirror/commands',
            '@codemirror/language', '@codemirror/search', '@codemirror/autocomplete',
            '@codemirror/lang-markdown', '@codemirror/theme-one-dark',
            '@lezer/common', '@lezer/highlight', '@lezer/lr', '@lezer/markdown',
          ];
          if (CM_CORE.some(pkg => id.includes(`${pkg}/`))) {
            return 'vendor-codemirror';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
      },
    },
  },
})
