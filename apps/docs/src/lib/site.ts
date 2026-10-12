export const siteName = "play-ui";

export const siteDescription =
  "Headless, composable and accessible React components that use motion to make the web feel playful.";

export const githubUrl = "https://github.com/abvthecity/play-ui";

/** The first page of the docs, where every "Docs" link lands. */
export const docsHome = "/docs/overview/introduction";

/** The path under `/docs/` a page's URL names, for the `/docs/$` route's splat. */
export function docsSplat(url: string): string {
  return url.replace(/^\/docs\/?/u, "");
}
