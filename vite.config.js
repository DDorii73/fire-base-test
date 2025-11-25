import { defineConfig } from 'vite'

export default defineConfig({
  // 환경 변수 설정
  envPrefix: 'VITE_',
  
  // base 경로 설정 (배포 시 루트 경로 사용)
  base: '/',
  
  // 빌드 설정
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
        }
      }
    },
    // 청크 크기 경고 제한 (500KB)
    chunkSizeWarningLimit: 500
  },
  
  // 개발 서버 설정
  server: {
    port: 5173,
    open: true
  },
  
  // 미리보기 서버 설정
  preview: {
    port: 4173,
    open: true
  }
})
