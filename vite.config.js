import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { execSync } from 'child_process';

// Generate build info before build
const generateBuildInfo = () => {
  try {
    execSync('node scripts/generate-build-info.js', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Failed to generate build info:', error.message);
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(), // Allows importing SVGs as React components
    {
      name: 'generate-build-info',
      buildStart() {
        generateBuildInfo();
      }
    }
  ],
  build: {
    outDir: 'build', // Match CRA's build directory
    target: browserslistToEsbuild(), // Use browserslist config for compatibility
  },
  server: {
    port: 3000, // Match CRA's default port
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@layouts': '/src/layouts',
      '@pages': '/src/pages',
      '@hooks': '/src/hooks',
      '@lib': '/src/lib',
      '@assets': '/src/assets',
      '@styles': '/src/styles',
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  // Add the following configuration to handle .js files as JSX
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});