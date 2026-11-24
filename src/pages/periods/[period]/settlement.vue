<script setup lang="ts">
import { useRoute } from 'vue-router'

import SettlementView from '@/components/periods/SettlementView.vue'

const route = useRoute('/periods/[period]/settlement')
</script>

<template>
  <SettlementView :period-id="route.params.period" />
</template>
