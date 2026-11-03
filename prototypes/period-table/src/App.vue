<script setup lang="ts">
// PROTOTYPE (issue #9): three versions of the period table, switchable with
// ?variant=shadcn|tanstack|native, to pick the table approach. Throwaway: deleted
// before the merge of docs/9-period-table-library.
import { computed, ref } from 'vue'
import PrototypeSwitcher from '@/prototype/PrototypeSwitcher.vue'
import { file, isClosed, lines, monthIds, patches, resetFixture } from '@/prototype/model'
import VariantNative from '@/variants/VariantNative.vue'
import VariantShadcn from '@/variants/VariantShadcn.vue'
import VariantTanstack from '@/variants/VariantTanstack.vue'

const variants = [
  { key: 'shadcn', name: 'shadcn-vue Table, row model by hand', component: VariantShadcn },
  { key: 'tanstack', name: 'shadcn-vue data-table, TanStack v9', component: VariantTanstack },
  { key: 'native', name: 'native <table>, Tailwind only', component: VariantNative },
]
const current = ref(new URLSearchParams(location.search).get('variant') ?? 'shadcn')
const active = computed(() => variants.find((v) => v.key === current.value) ?? variants[0])

function change(key: string) {
  current.value = key
  const url = new URL(location.href)
  url.searchParams.set('variant', key)
  history.replaceState(null, '', url)
}

// The state panel reads the active version's grid through this ref.
const view = ref<{ grid?: { row: number; col: number; editing: boolean; draft: string } } | null>(null)
const selection = computed(() => {
  const g = (view.value as any)?.grid
  if (!g) return null
  const line = lines[g.row]
  const raw = line.type === 'input' ? file.months[g.col][line.section][line.key] : undefined
  return { month: monthIds[g.col], field: line.id, mode: g.editing ? 'edit' : 'selection', draft: g.editing ? g.draft : undefined, stored: raw ?? '(absent)' }
})
</script>

<template>
  <div class="mx-auto max-w-[1600px] p-4 pb-20 font-sans text-foreground">
    <header class="mb-3 flex flex-wrap items-baseline gap-4">
      <h1 class="text-lg font-semibold">Période {{ file.periodName }} — prototype #9</h1>
      <span class="text-sm text-muted-foreground">Version : {{ active.name }}</span>
      <label class="flex items-center gap-2 text-sm"><input v-model="isClosed" type="checkbox" /> Période clôturée</label>
      <button class="rounded border px-2 py-1 text-sm" @click="resetFixture">Réinitialiser</button>
    </header>
    <p class="mb-3 text-xs text-muted-foreground">
      Tab entre dans le tableau. Flèches : déplacer. Entrée ou une frappe : éditer. Entrée en édition : enregistrer et descendre.
      Échap : annuler. Double clic : éditer. <i>Italique</i> = hérité, gris = index précédent déduit, hachures = mode tarifaire inactif.
    </p>
    <button class="mb-2 rounded border px-2 py-1 text-xs">Bouton avant le tableau</button>

    <component :is="active.component" :key="active.key" ref="view" />

    <button class="mt-2 rounded border px-2 py-1 text-xs">Bouton après le tableau</button>

    <section class="mt-4 grid gap-4 text-xs md:grid-cols-2">
      <div>
        <h2 class="mb-1 font-semibold">Sélection</h2>
        <pre class="rounded bg-muted p-2">{{ JSON.stringify(selection, null, 2) }}</pre>
      </div>
      <div>
        <h2 class="mb-1 font-semibold">Patches ({{ patches.length }}, le plus récent en premier)</h2>
        <pre class="max-h-60 overflow-auto rounded bg-muted p-2">{{ patches.map((p) => JSON.stringify(p)).join('\n') || '(aucun)' }}</pre>
      </div>
    </section>

    <PrototypeSwitcher :variants="variants" :current="active.key" @change="change" />
  </div>
</template>
