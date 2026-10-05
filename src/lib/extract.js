// lib/extract.js
import * as cheerio from "cheerio";

const MAX_WORDS = 3000;

export function extractSignals(html, url = null) {
  const $ = cheerio.load(html);

  // Structured data types (JSON-LD)
  const schemaTypes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const items = Array.isArray(data) ? data : data["@graph"] || [data];
      items.forEach((i) => i["@type"] && schemaTypes.push(i["@type"]));
    } catch {}
  });

  // Calls to action: buttons and link-buttons
  const ctas = [];
  $("button, a[class*='btn'], a[class*='button'], input[type='submit']").each(
    (_, el) => {
      const text = ($(el).text() || $(el).attr("value") || "")
        .trim()
        .replace(/\s+/g, " ");
      if (text && text.length < 60) ctas.push(text);
    },
  );

  const images = $("img");
  const imagesMissingAlt = images.filter(
    (_, el) => !$(el).attr("alt")?.trim(),
  ).length;

  // Visible text only
  $("script, style, noscript, svg, iframe").remove();
  $("br, p, div, li, h1, h2, h3, h4, h5, h6, a, button, span, section").after(
    " ",
  );
  const text = $("body").text().replace(/\s+/g, " ").trim();
  const words = text.split(" ");

  const lower = text.toLowerCase();
  const links = $("a[href]");

  return {
    url,
    lang: $("html").attr("lang") || null,
    title: $("title").first().text().trim() || null,
    metaDescription:
      $('meta[name="description"]').attr("content")?.trim() || null,
    canonical: $('link[rel="canonical"]').attr("href") || null,
    robotsMeta: $('meta[name="robots"]').attr("content") || null,
    hasViewport: $('meta[name="viewport"]').length > 0,
    openGraph: {
      title: $('meta[property="og:title"]').attr("content") || null,
      image: $('meta[property="og:image"]').attr("content") || null,
    },
    h1: $("h1")
      .map((_, el) => $(el).text().trim())
      .get(),
    h2: $("h2")
      .map((_, el) => $(el).text().trim())
      .get()
      .slice(0, 15),
    ctas: [...new Set(ctas)].slice(0, 15),
    images: { total: images.length, missingAlt: imagesMissingAlt },
    links: { total: links.length },
    schemaTypes: [...new Set(schemaTypes.flat())],
    trustSignals: {
      mentionsTestimonials:
        /testimonial|what (our )?(clients|customers) say/.test(lower),
      mentionsReviews: /review|rated|stars/.test(lower),
      hasPhoneOrEmail:
        /(\+?\d[\d\s().-]{8,}\d)/.test(text) ||
        $("a[href^='mailto:'], a[href^='tel:']").length > 0,
      hasAboutLink: $("a[href*='about']").length > 0,
    },
    wordCount: words.length,
    text: words.slice(0, MAX_WORDS).join(" "),
  };
}
