import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { TanstackProvider } from "fumadocs-core/framework/tanstack";
import type { ReactElement } from "react";

import { siteDescription, siteName } from "@/lib/site.ts";

import appCss from "@/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: siteName },
      { name: "description", content: siteDescription },
      { name: "color-scheme", content: "light dark" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  component: RootComponent,
});

function RootComponent(): ReactElement {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <TanstackProvider>
          <Outlet />
        </TanstackProvider>
        <Scripts />
      </body>
    </html>
  );
}
