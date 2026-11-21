<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import { usePeriods } from '@/composables/usePeriods'
import { useSession } from '@/composables/useSession'

const { drainQueued } = usePeriods()
const { isSignedIn } = useSession()

// App load and the browser coming back online drain the queue (a signed-out drain would only 401).
const drainIfSignedIn = () => {
  if (isSignedIn.value) void drainQueued()
}
onMounted(() => {
  drainIfSignedIn()
  window.addEventListener('online', drainIfSignedIn)
})
onUnmounted(() => window.removeEventListener('online', drainIfSignedIn))
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
</template>
