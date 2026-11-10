<template>
  <div data-testid="app-shell" class="flex min-h-screen flex-col">
    <header class="border-b px-4 py-3">
      <p class="font-semibold">Charges de location</p>
    </header>
    <main class="flex-1 px-4 py-6">
      <slot />
    </main>
  </div>
</template>
