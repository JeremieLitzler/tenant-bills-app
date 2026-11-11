# Feedback from the /mattpocock-skills:code-review

## How to discuss the points

Use the style "Question then Answer" of /grilling-rounds (numbering, question suffix, etc) to deal with each point (or related points) in a dedicated round series under this folder.

Add a round until all points are closed.

Challenge my decisions on closed point if they drift from our shared understanding.
 
**IMPORTANT:** Confirm you understand the drill before any round file generation.

## Documentation drift

- on `docs/architecture.md`: why were restore, markSignedIn and setPendingCountSource added to `useSession`?
- about `safeRedirect.ts`, it seems fine to have it.
- about `sessionHint.ts`, why would we need this for offline support? Too early to deal with that also. F9 takes care the PWA
- about the redirect in `sign-in.vue`, we should have the redirect in the `main.ts` guard that runs before the sign-in page is loaded, don't we?

## Judgment calls

### Duplicated rule 

I agree, but can we share the logic between the code in the Netlify functions and the app itself. I doubt it.

### Scattered names

Same concern as previous point.

### Names

Yes, but we are in a Netlify function, outside Vue's scope. What would you suggest to replace `value` in the output of `readGithubLogin`?

True, but I need to understand why we need `sessionHint.ts` file and the method `restore()` in `useSessiong`.

### Scaffolding

So remove them since it is too early to implement

### IndexedDB

Pending question in § "Documentation drift".

### Test helper

Suggest fix using best practices

## Spec

###  Missing or partial (all F2/F3 dependencies)

For the first 2 point, remove what's not needed for issue 28.

For story 5, where did you put the messages?

## Not asked for

### A third error code, failed

Is that for a "catch all" code if an error doesn't fall into the others?

### About The login name and "Se déconnecter" button in the header

What is the issue? The labels not confirmed by me in the `sign-in.vue`?

### scope=repo

I don't find it in the code...

## Possibly wrong

### Forgeable hint

I think we should drop that. Related to question about `sessionHint.ts`

### Secure cookie

Clarify spec then

### Offline sign-out

When offline, no way to know if you're sign-in or signed out. Is it the point of `sessionHint.ts`?