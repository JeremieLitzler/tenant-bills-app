<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useSession } from '@/composables/useSession'
import { safeRedirect } from '@/lib/safeRedirect'

definePage({ meta: { public: true } })

const route = useRoute()
const router = useRouter()
const session = useSession()

const redirect = computed(() => safeRedirect(route.query.redirect))

const errorMessages: Record<string, string> = {
  'not-allowed': "Ce compte GitHub n'est pas autorisé à utiliser l'application.",
  misconfigured:
    "L'application n'est pas configurée correctement. Consultez les journaux des fonctions Netlify.",
  failed: 'La connexion à GitHub a échoué. Merci de réessayer.',
}
const errorMessage = computed(() => {
  const code = route.query.error
  return typeof code === 'string' ? errorMessages[code] : undefined
})

// The callback function ends here with `signed-in=<login>`; an already signed-in visitor
// has nothing to do on this page either.
onMounted(async () => {
  const signedInLogin = route.query['signed-in']
  if (typeof signedInLogin === 'string' && signedInLogin !== '') {
    session.markSignedIn(signedInLogin)
  } else {
    await session.restore()
  }
  if (session.isSignedIn.value && !errorMessage.value) {
    await router.replace(redirect.value ?? '/')
  }
})
</script>

<template>
  <section class="mx-auto flex max-w-sm flex-col gap-4">
    <h1 class="text-2xl font-semibold">Connexion</h1>
    <p v-if="errorMessage" role="alert" data-testid="sign-in-error" class="text-red-700">
      {{ errorMessage }}
      <a
        v-if="route.query.error === 'misconfigured'"
        href="https://app.netlify.com/"
        target="_blank"
        rel="noopener"
        class="underline"
        >Ouvrir Netlify</a
      >
    </p>
    <button
      type="button"
      class="rounded bg-black px-4 py-2 text-white"
      @click="session.signIn(redirect)"
    >
      Se connecter avec GitHub
    </button>
  </section>
</template>
