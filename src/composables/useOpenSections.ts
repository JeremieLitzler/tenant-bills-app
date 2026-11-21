// The open sections of the period page and the month form, kept in the URL query
// (`?open=electricity,internet`) so a reload or coming back from a month keeps them. "common" is
// always shown, so it is not a collapsible section; an unknown name is ignored.
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { SECTIONS } from '@/components/periods/periodLines'

const COLLAPSIBLE: string[] = SECTIONS.map((section) => section.id).filter((id) => id !== 'common')

export function useOpenSections() {
  const route = useRoute()
  const router = useRouter()

  const open = computed(() => {
    const raw = typeof route.query.open === 'string' ? route.query.open.split(',') : []
    return COLLAPSIBLE.filter((id) => raw.includes(id))
  })
  const toQuery = (ids: string[]) => (ids.length ? { open: ids.join(',') } : {})
  // The query that carries the open sections to another page.
  const openQuery = computed(() => toQuery(open.value))

  const isOpen = (id: string) => open.value.includes(id)

  function setOpen(id: string, value: boolean) {
    if (isOpen(id) === value) return
    const next = COLLAPSIBLE.filter((other) => (other === id ? value : isOpen(other)))
    void router.replace({ query: { ...route.query, open: toQuery(next).open } })
  }

  return { isOpen, setOpen, openQuery, toQuery, open }
}
