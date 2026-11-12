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
    signOut: 'Se déconnecter',
  },
  periods: {
    title: 'Périodes',
    loading: 'Chargement des périodes…',
    empty: 'Aucune période pour le moment.',
    error: 'Impossible de charger les périodes. Merci de réessayer.',
  },
  period: {
    loading: 'Chargement de la période…',
    notFound: 'Période introuvable.',
    error: 'Impossible de charger la période. Merci de réessayer.',
    readOnlyNotice:
      "Cette période est ouverte en lecture seule : l'application ne la modifiera jamais.",
    refresh: {
      button: 'Rafraîchir',
      refreshing: 'Rafraîchissement…',
      upToDate: 'La période est à jour.',
      updated: "La période a été mise à jour avec les modifications de l'autre appareil.",
      failed: 'Impossible de rafraîchir la période. Merci de réessayer.',
    },
    problems: {
      'schema-version': 'La version du format du fichier est inconnue ou plus récente.',
      months: "Les mois ne sont pas les douze mois de la période, dans l'ordre.",
      'tenant-bill-advance': "Un mois n'a pas d'avance sur charges.",
      'water-index': "Un index du compte d'eau n'est pas un nombre entier.",
      'closed-on': 'La date de clôture est mal formée.',
    },
  },
  session: {
    confirmSignOut(pendingCount: number): string {
      const plural = pendingCount > 1 ? 's' : ''
      return `${pendingCount} modification${plural} pas encore enregistrée${plural}. Se déconnecter quand même ?`
    },
  },
} as const
