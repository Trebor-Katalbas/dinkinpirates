import { defineConfig, lazyPlugins } from 'vite-plus'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  lint: {
    ignorePatterns: [
      '.next/**',
      'node_modules/**',
      'public/mockServiceWorker.js',
      'next-env.d.ts',
      '.agents/**',
      '.claude/**',
    ],
    plugins: ['oxc', 'typescript', 'unicorn', 'react'],
    categories: { correctness: 'error' },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {},
    overrides: [
      {
        // Generated shadcn/ui primitives
        files: ['src/components/ui/**'],
        rules: { 'typescript/restrict-template-expressions': 'off' },
      },
    ],
  },
  fmt: {
    ignorePatterns: [
      'public/mockServiceWorker.js',
      '.next/**',
      '.agents/**',
      '.claude/**',
      'CLAUDE.md',
      'SKILLS.md',
      'AGENTS.md',
      'skills-lock.json',
      'package-lock.json',
    ],
    semi: false,
    singleQuote: true,
    tabWidth: 2,
    printWidth: 100,
  },
})
