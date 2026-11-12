<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import MisconfiguredNotice from '@/components/MisconfiguredNotice.vue'
import { useSession } from '@/composables/useSession'
import { fr } from '@/i18n/fr'
import { safeRedirect } from '@/lib/safeRedirect'

definePage({ meta: { public: true } })

const route = useRoute()
const session = useSession()

const redirect = computed(() => safeRedirect(route.query.redirect))

const errorMessage = computed(() => {
  const code = route.query.error
  return typeof code === 'string' && code in fr.signIn.errors
    ? fr.signIn.errors[code as keyof typeof fr.signIn.errors]
    : undefined
})
</script>

<template>
  <section class="mx-auto flex max-w-sm flex-col gap-4">
    <h1 class="text-2xl font-semibold">{{ fr.signIn.title }}</h1>
    <div v-if="route.query.error === 'misconfigured'" data-testid="sign-in-error">
      <MisconfiguredNotice />
    </div>
    <p v-else-if="errorMessage" role="alert" data-testid="sign-in-error" class="text-red-700">
      {{ errorMessage }}
    </p>
    <button
      type="button"
      class="rounded bg-black px-4 py-2 text-white"
      @click="session.signIn(redirect)"
    >
      {{ fr.signIn.button }}
    </button>
  </section>
</template>
