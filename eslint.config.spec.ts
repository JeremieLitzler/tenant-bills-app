import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'

// src/domain/ and src/sync/ import nothing from Vue (docs/architecture.md).
describe('ESLint config: Vue-free folders', () => {
  const eslint = new ESLint()

  async function ruleIdsFor(code: string, filePath: string) {
    const [result] = await eslint.lintText(code, { filePath })
    return result!.messages.map((message) => message.ruleId)
  }

  // The first lint loads the config and the TypeScript parser, which takes a few seconds.
  beforeAll(() => eslint.calculateConfigForFile('src/domain/example.ts'), 30_000)

  it.each([
    ['vue', 'src/domain/example.ts', "import { ref } from 'vue'\nexport const x = ref(1)\n"],
    [
      'vue-router',
      'src/sync/example.ts',
      "import { useRoute } from 'vue-router'\nexport const r = useRoute\n",
    ],
    [
      'a .vue file',
      'src/domain/example.ts',
      "import Shell from '@/components/layout/AppShell.vue'\nexport { Shell }\n",
    ],
    ['vue', 'src/domain/example.mts', "import { ref } from 'vue'\nexport const x = ref(1)\n"],
  ])('reports an import of %s in %s', async (_label, filePath, code) => {
    expect(await ruleIdsFor(code, filePath)).toContain('no-restricted-imports')
  })

  it('allows Vue imports outside those folders', async () => {
    const code = "import { ref } from 'vue'\nexport const x = ref(1)\n"
    expect(await ruleIdsFor(code, 'src/composables/example.ts')).not.toContain(
      'no-restricted-imports',
    )
  })
})
