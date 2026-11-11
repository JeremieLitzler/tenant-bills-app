// Every UI string of the app, in French. A plain object: no i18n library, one language.
// Components and composables import from here instead of writing text inline.
export const fr = {
  signIn: {
    title: 'Connexion',
    button: 'Se connecter avec GitHub',
    netlifyLink: 'Ouvrir Netlify',
    errors: {
      'not-allowed': "Ce compte GitHub n'est pas autorisé à utiliser l'application.",
      misconfigured:
        "L'application n'est pas configurée correctement. Consultez les journaux des fonctions Netlify.",
      failed: 'La connexion à GitHub a échoué. Merci de réessayer.',
    },
  },
  shell: {
    appName: 'Charges de location',
    signOut: 'Se déconnecter de GitHub',
  },
  session: {
    confirmSignOut(pendingCount: number): string {
      const plural = pendingCount > 1 ? 's' : ''
      return `${pendingCount} modification${plural} pas encore enregistrée${plural}. Se déconnecter quand même ?`
    },
  },
} as const
