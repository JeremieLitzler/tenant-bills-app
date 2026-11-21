<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import { useOnline } from '@/composables/useOnline'
import { usePeriods } from '@/composables/usePeriods'
import { useSession } from '@/composables/useSession'

const { drainQueued, loadPendingCounts } = usePeriods()
const { isSignedIn } = useSession()
const { online } = useOnline()

// App load and the browser coming back online drain the queue (a signed-out drain would only 401).
const drainIfSignedIn = () => {
  if (isSignedIn.value) void drainQueued()
}
onMounted(() => {
  void loadPendingCounts()
  drainIfSignedIn()
})
watch(online, (isOnline) => isOnline && drainIfSignedIn())
</script>

<template>
  <AppShell>
    <RouterView />
  </AppShell>
</template>
