<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { misconfiguredToast, useToasts } from '@/composables/useToasts'
import { useSession } from '@/composables/useSession'
import { fr } from '@/i18n/fr'
import { safeRedirect } from '@/lib/safeRedirect'

definePage({ meta: { public: true } })

const route = useRoute()
const router = useRouter()
const session = useSession()

const redirect = computed(() => safeRedirect(route.query.redirect))

// The error of a failed sign-in, told once by a toast; `error` then leaves the URL so a reload
// does not tell it again.
onMounted(() => {
  const { error, ...query } = route.query
  if (error === undefined) return
  if (error === 'misconfigured') useToasts().notify(misconfiguredToast)
  else if (typeof error === 'string' && error in fr.signIn.errors)
    useToasts().notify({
      level: 'error',
      message: fr.signIn.errors[error as keyof typeof fr.signIn.errors],
    })
  void router.replace({ query })
})
</script>

<template>
  <section class="mx-auto flex max-w-sm flex-col gap-4">
    <h1 class="text-2xl font-semibold">{{ fr.signIn.title }}</h1>
    <button
      type="button"
      class="rounded bg-black px-4 py-2 text-white"
      @click="session.signIn(redirect)"
    >
      {{ fr.signIn.button }}
    </button>
  </section>
</template>
