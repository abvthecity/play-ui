import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactElement } from "react";

import { CardStackDemo } from "@/components/demos/card-stack-demo.tsx";
import { SiteHeader } from "@/components/site-header.tsx";
import { docsHome, docsSplat, githubUrl, siteDescription } from "@/lib/site.ts";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home(): ReactElement {
  return (
    <div className="home">
      <SiteHeader />
      <main className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Open source · React</p>
          <h1>Interfaces you can pick up and play with.</h1>
          <p className="hero-lede">{siteDescription}</p>
          <div className="hero-actions">
            <Link to="/docs/$" params={{ _splat: docsSplat(docsHome) }} className="button">
              Read the docs
            </Link>
            <a href={githubUrl} className="button button-quiet" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
        <div className="hero-demo">
          <CardStackDemo />
        </div>
      </main>
    </div>
  );
}
