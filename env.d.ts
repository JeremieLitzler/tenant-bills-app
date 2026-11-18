/// <reference types="vite/client" />

declare global {
  interface Window {
    // Development only: edits the open period from the console (src/pages/periods/[period].vue).
    setCell?: (month: string | null, field: string, value: unknown) => Promise<void>
  }
}

export {}
