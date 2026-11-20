# Grilling summary — global toast notifications (issue #120)

## Shared understanding

The app tells the landlord about one-off events (the result of "Rafraîchir", a failed save) with inline lines that stay on the page, or not at all: a failed drain only reaches the console. This grilling settled one global toast stack for those events, a first status colour palette, and which messages move.

Toasts are built on reka-ui's Toast primitives, styled with Tailwind, the way `ApplyDialog.vue` already uses reka-ui's dialog primitives. The starting idea was a hand-built stack, but the timer that pauses on hover and focus and the live region announced by screen readers are easy to get wrong by hand, and reka-ui is already installed and used, so it costs no new dependency. Swipe and animation are left out: every toast has a close button, and the animation library is not used anywhere, so it is removed rather than adopted.

There are three levels: info, warning and error. Success has its colour in the palette but no level until a message needs it, which is one more value of the level type. An info toast closes after 5 seconds (the issue's 2-3 seconds is too short for the French sentences, more so on a phone); warnings and errors stay until closed. Every toast has a close button and an icon of its level, so colour is never the only signal. Warnings and errors are announced at once (`role="alert"`), info politely (`role="status"`), and no toast takes the focus. Toasts sit at the bottom right on a wide screen and full width at the bottom on a phone, stack newest nearest the corner with at most three visible, never show the same message twice while it is on screen, and survive navigation.

Code shows a toast through a singleton `useToasts()` composable (`notify({ level, message, link? })`, `dismiss(id)`), rendered by one `ToastStack` in the app shell. The composable that knows the event calls `notify`, so pages stop turning statuses into messages; the sign-in page is the one exception, since only it reads `?error=`.

The messages that move to toasts are the "Rafraîchir" result, a failed drain (instead of the error banner #50 planned, #50 keeping its badge and sync status), the load errors of the period list and of a period (the page then shows a "Réessayer" button so it is never blank), the misconfigured notice (with its "Ouvrir Netlify" link) and the sign-in errors (shown once, then `error` is removed from the URL). The invalid-value message of the "Saisie du mois" form and the read-only notice stay inline, because they describe the page as long as it shows; the read-only notice gets the warning look to be obvious.

Going offline was first seen as no toast at all (#50's rule for its banner). It became a warning toast that closes by itself when the network returns, plus a second warning, "La synchronisation des modifications est en pause.", when a drain fails because the browser is offline. Both are F9 work and go to a new F9 issue.

The palette is four status colours as CSS variables with a `theme` prefix in `src/assets/index.css`, from Tailwind's defaults: blue info, green success, amber warning, red error. shadcn's `--destructive` points to `--theme-error`, and the existing `text-amber-600` moves to the warning token. A brand colour replacing today's black `primary` was wanted, but its value, its link to the PWA theme colour and the buttons that would show it are decided in #88. Dark mode is a separate grilling.

No term entered `GLOSSARY.md`: a toast is a UI notion, not domain language. No ADR either: every choice here is cheap to reverse.

## Decision index

- Q1/Q12b (v02): toasts are built on reka-ui's Toast primitives, styled with Tailwind.
- Q2/Q13 (v02): three levels now, info, warning and error; success comes with its first message.
- Q3 (v01): an info toast closes after 5 seconds.
- Q4 (v01): warning and error toasts stay until closed.
- Q5 (v01): every toast has a close button.
- Q6 (v01): bottom right on a wide screen, full width at the bottom with 16px side margins on a phone.
- Q7 (v01): toasts stack newest nearest the corner, at most 3 visible, the others wait.
- Q8 (v01): the three "Rafraîchir" outcomes become toasts (`upToDate`, `updated` info; `failed` error); the inline line goes.
- Q9 (v01): a failed drain is an error toast instead of #50's banner; #50 keeps badge and status and its text is updated.
- Q10 (v01): going offline shows a warning toast.
- Q11/Q21 (v02): load errors of the list and of a period, the misconfigured notice and the sign-in errors move to toasts; the invalid-value message and the read-only notice stay inline.
- Q14 (v02): the offline warning closes by itself when back online.
- Q15 (v02): coming back online shows no toast.
- Q16 (v02): a drain failing because offline adds the toast "La synchronisation des modifications est en pause."
- Q17 (v02): a message already on screen is not shown again.
- Q18 (v02): a page whose load failed shows a "Réessayer" button.
- Q19 (v02): the misconfigured toast keeps the "Ouvrir Netlify" link in its text.
- Q20 (v02): a sign-in error toast shows once, then `error` is removed from the URL.
- Q22 (v02): toasts survive navigation.
- Q23 (v02), narrowed by Q36 (v03): this issue's palette is the four status colours; the brand colour is decided in #88.
- Q24 (v02): colours are `theme`-prefixed CSS variables in `src/assets/index.css`, exposed as Tailwind colours.
- Q25 (v02): blue info, green success, amber warning, red error, from Tailwind's default palette.
- Q26 (v02): `text-amber-600` in `MonthForm.vue` moves to the warning token; `destructive` classes stay.
- Q27 (v02): light tint, border and lucide icon (`Info`, `CircleCheck`, `TriangleAlert`, `CircleX`) of the level's colour, dark text.
- Q28 (v02): warning and error `role="alert"`, info and success `role="status"`; no focus taken.
- Q29 (v02): I open a "Grill dark mode" issue.
- Q31 (v03): the offline warning goes into a new child issue of #36 (F9), blocked by the toast implementation issue and #50.
- Q31b (v03): the "en pause" toast goes into that same F9 issue.
- Q32 (v03): the "en pause" toast is a warning.
- Q32b (v03): it closes by itself when back online.
- Q33 (v03): I open a "Grill a toast per drain attempt with a retry counter" issue.
- Q34 (v03): "Réessayer" shows on both the period list and the period page and runs the same load again.
- Q35 (v03): the read-only notice takes the warning look, inline, without close button.
- Q36 to Q38 (v03): brand value, PWA theme colour link, `--primary` wiring and hand-styled buttons are decided in #88.
- Q39 (v03): `--theme-info`, `--theme-success`, `--theme-warning`, `--theme-error`; classes `bg-theme-warning`, `text-theme-info`, ...
- Q39b (v03): `--theme-error` holds the red; `--destructive` is `var(--theme-error)`.
- Q40 (v03): #90 gets a comment that a toast exists and may host its prompt; #90 decides.
- Q41 (v03): singleton `useToasts()` with `notify({ level, message, link? })`, `dismiss(id)` and the readonly list; one `ToastStack` in `AppShell.vue`.
- Q42 (v03): the composable that knows the event calls `notify`; the sign-in page is the exception.
- Q43 (v03): specs of `useToasts` and `ToastStack`, and the period page and sign-in specs updated.
- Q44b (v04): a separate small issue handles the dependency housekeeping.
- Q45 (v04): no toast animation.
- Q46 (v04): I comment on #88 with the brand-colour decisions left there.
- Q47 (v05): `@import 'shadcn-vue/tailwind.css'` stays; `@import 'tw-animate-css'` goes.
- Q47b (v05): the separate issue removes `tw-animate-css` and its import and moves `shadcn-vue` to `devDependencies`.

## Rejected alternatives

- Q1/Q12b: hand-built stack, your first preference, lost because the timer pause and the live region are what is easy to get wrong, and reka-ui is already installed and used.
- Q1/Q12b: shadcn-vue's Sonner, lost because it adds `vue-sonner` for stacking animations nothing needs.
- Q2/Q13: four levels now, lost because no message uses success yet and adding it later is one value.
- Q3: 3 seconds for info, lost because the French sentences are too long to read in that time.
- Q10: no toast when merely offline (#50's rule), lost: you want the landlord warned.
- Q11: keeping the load errors, misconfigured notice and sign-in errors inline, lost: you want them as toasts.
- Q16: no "en pause" toast on an offline drain, lost: you want the second toast.
- Q18: a blank content area or a lasting inline line after a load error, lost to the "Réessayer" button.
- Q21: the read-only notice as a toast, lost: it describes the page as long as it shows ("I meant not to move the read-only notice to toast").
- Q23: four status colours only, first lost to adding a brand colour, then the brand colour moved to #88.
- Q24: Tailwind colours used directly without tokens, lost because it scatters the values and makes dark mode harder.
- Q31: building the offline warning in #50 or in the toast issue, lost: you see it as F9 work.
- Q36b: violet, teal or slate as brand colour, not chosen here: "I'll decide in #88".
- Q40: making #90's prompt a toast now, lost because a button inside a toast has one unbuilt user.
- Q44b: moving the dependencies in the toast implementation issue, lost to a separate issue.
- Q45: a fade-and-slide animation with `tw-animate-css`, lost: the package is unused, so it is removed ("I'll ask to add it back if I really need animation").

## Never grilled, decided to write this summary

- The close button's accessible name is "Fermer", in `src/i18n/fr.ts` with the other new strings ("Réessayer"); toast messages are passed already translated, from `fr`.
  - Approved
- "No repeat" (Q17) compares the message text, whatever the level.
  - Approved
- The 16px phone margins (Q6) and the "wide screen" breakpoint follow Tailwind's `sm` breakpoint.
  - Approved

## Next moves, once this summary is confirmed

- Open the toast implementation issue from this summary.
- Update #50's text: the failed-drain banner becomes the error toast of this issue.
- Open the F9 child issue of #36 for the offline warning and the "en pause" toast (Q31, Q31b).
- Open the separate housekeeping issue (Q44b, Q47b).
- Open "Grill dark mode" (Q29) and "Grill a toast per drain attempt with a retry counter" (Q33), both `needs-triage`.
- Comment on #88 (Q46) and on #90 (Q40).
