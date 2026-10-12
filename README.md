# play-ui

Headless, composable and accessible React components that use motion to make the web feel playful.

Each component owns the gesture, the physics and the accessibility, and leaves every pixel of the
look to you. Documentation lives in [`apps/docs`](apps/docs/content/docs).

## Packages

| Package                                        | Description                                     |
| ---------------------------------------------- | ----------------------------------------------- |
| [`@play-ui/react-cards`](packages/react-cards) | A swipeable card stack and the motion around it |

## Development

Requires Node 24 and pnpm through Corepack (`corepack enable`).

```sh
pnpm install
pnpm dev      # the docs site at http://localhost:3000
pnpm check    # lint, format, typecheck, test and build
```
