<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useSession } from '@/composables/useSession'
import { fr } from '@/i18n/fr'

const session = useSession()
const route = useRoute()
const router = useRouter()

// When the session ends (a 401 or sign-out), re-run the current route so the global guard
// redirects to the sign-in page.
watch(session.isSignedIn, (signedIn) => {
  if (!signedIn) {
    void router.replace(route.fullPath)
  }
})
</script>

<template>
  <div data-testid="app-shell" class="flex min-h-screen flex-col">
    <header class="flex items-center justify-between border-b px-4 py-3">
      <p class="font-semibold">{{ fr.shell.appName }}</p>
      <p v-if="session.isSignedIn.value" class="flex items-center gap-3 text-sm">
        <span data-testid="session-login">{{ session.login.value }}</span>
        <button type="button" class="underline" @click="session.signOut()">
          {{ fr.shell.signOut }}
        </button>
      </p>
    </header>
    <main class="flex-1 px-4 py-6">
      <slot />
    </main>
  </div>
</template>
