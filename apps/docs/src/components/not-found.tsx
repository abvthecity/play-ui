import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { docsHome, docsSplat } from "@/lib/site.ts";

export function NotFound(): ReactElement {
  return (
    <main className="not-found">
      <p className="eyebrow">404</p>
      <h1>This page wandered off</h1>
      <p>It may have moved, or it was never here.</p>
      <Link to="/docs/$" params={{ _splat: docsSplat(docsHome) }} className="button">
        Back to the docs
      </Link>
    </main>
  );
}
