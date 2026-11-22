# Icons are local Vue components generated from the Iconify Lucide set, with no icon package

The app has no icon package. Each icon is a single-file component in `src/components/icons/`, named `Icon<PascalCaseName>.vue` (`IconCircleCheck.vue`), imported where used (`import IconX from '@/components/icons/IconX.vue'`). To add one, take it from the Lucide set on https://icon-sets.iconify.design/lucide/, use "Generate component" with "Do not split SVG to SVG and CSS" and "Use TypeScript" selected (or fetch `https://api.iconify.design/lucide/<kebab-name>.svg` and wrap it in the same template), and save it as a new `Icon<Name>.vue`. The component is an inline `<svg>` sized `1em` with `currentColor`, so callers size and color it with Tailwind classes (`class="size-4 text-theme-error"`) and pass `aria-hidden` themselves. Do not edit the path data and do not add an icon package back.

## Considered options

- **`@lucide/vue`**: rejected. It was imported in five files for eight icons, so the dependency was heavier than the code it served.
- **A generic `<Icon name="..." />` component backed by Iconify at runtime**: rejected. It fetches icons over the network, which breaks offline use, and it adds an indirection for eight static icons.

## Consequences

- Adding an icon is a new file, not a dependency update.
- `components.json` keeps `"iconLibrary": "lucide"`: the shadcn-vue tool falls back to Lucide when the key is missing, so removing it changes nothing. Components it generates import `@lucide/vue`, so replace that import with a local icon after generating one.
