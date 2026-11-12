<script setup lang="ts">
import { fr } from '@/i18n/fr'
</script>

<template>
  <p role="alert" data-testid="misconfigured" class="text-red-700">
    {{ fr.signIn.errors.misconfigured }}
    <a href="https://app.netlify.com/" target="_blank" rel="noopener" class="underline">{{
      fr.signIn.netlifyLink
    }}</a>
  </p>
</template>
