import type { MetadataRoute } from "next"

// Allow all crawlers, with OAI-SearchBot named explicitly: OpenAI requires
// that it not be blocked for pages to be eligible in ChatGPT search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
    ],
    sitemap: "https://www.nextax.ai/sitemap.xml",
  }
}
