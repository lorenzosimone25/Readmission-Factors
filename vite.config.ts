import { existsSync } from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const parquetFile = path.resolve(__dirname, 'src/data/readmit_30d.parquet');
const parquetStub = path.resolve(__dirname, 'src/data/parquet.url.stub.ts');
const useMockData = process.env.VITE_USE_MOCK_CASES === 'true';
const useParquetStub = !existsSync(parquetFile);
const datasetImplFile = path.resolve(
  __dirname,
  'src/features/readmission/data/readmissionDataset.impl.ts',
);
const datasetImpl = useMockData
  ? datasetImplFile
  : path.resolve(__dirname, 'src/features/readmission/data/readmissionDataset.parquet.impl.ts');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      ...(useMockData ? {} : { [datasetImplFile]: datasetImpl }),
      ...(useParquetStub ? { '@/data/readmit_30d.parquet?url': parquetStub } : {}),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
});
