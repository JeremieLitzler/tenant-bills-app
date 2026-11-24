<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { fr } from '@/i18n/fr'
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold">Bienvenue</h1>
    <RouterLink to="/periods" class="underline">{{ fr.periods.title }}</RouterLink>
  </div>
</template>
