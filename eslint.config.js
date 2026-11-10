import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'

import { vueFreeFolders } from './vue-free-folders.ts'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.netlify/**',
      'prototypes/**',
      'typed-router.d.ts',
    ],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    // Single-word page file names (index.vue) are the file-based routing convention.
    rules: { 'vue/multi-word-component-names': 'off' },
  },
  {
    // src/domain/ and src/sync/ import nothing from Vue (docs/architecture.md).
    name: 'app/vue-free',
    files: vueFreeFolders.map((folder) => `${folder}/**/*.{ts,mts,tsx}`),
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['vue', 'vue-router', 'vue-router/*', '@vue/*', '@vueuse/*', '*.vue'],
              message: 'src/domain/ and src/sync/ must stay Vue-free (docs/architecture.md).',
            },
          ],
        },
      ],
    },
  },
  skipFormatting,
)
