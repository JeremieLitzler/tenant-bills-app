import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

// Two environments (docs/architecture-tests.md):
// - node: the Vue-free code (src/domain/, src/sync/), the Netlify functions and the repo config;
// - dom: components and pages, mounted with @vue/test-utils in happy-dom.
const nodeSpecs = [
  'src/domain/**/*.spec.ts',
  'src/sync/**/*.spec.ts',
  'netlify/**/*.spec.ts',
  '*.spec.ts',
]

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: { name: 'node', environment: 'node', include: nodeSpecs },
        },
        {
          extends: true,
          test: {
            name: 'dom',
            environment: 'happy-dom',
            include: ['src/**/*.spec.ts'],
            exclude: ['src/domain/**', 'src/sync/**'],
          },
        },
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'html'],
        include: ['src/**/*.{ts,vue}', 'netlify/**/*.ts'],
        exclude: ['**/*.spec.ts', 'src/main.ts', 'src/components/ui/**'],
      },
    },
  }),
)
