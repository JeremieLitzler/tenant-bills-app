<script setup lang="ts">
import { fr } from '@/i18n/fr'
</script>

<template>
  <p role="alert" data-testid="misconfigured" class="text-red-700">
    {{ fr.misconfigured.message }}
    <a href="https://app.netlify.com/" target="_blank" rel="noopener" class="underline">{{
      fr.misconfigured.netlifyLink
    }}</a>
  </p>
</template>
