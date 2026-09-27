import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CreatorHub",
    short_name: "CreatorHub",
    description: "Campaigns, creators and advertising management",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0A1931",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
