import { blueNoteHref, getBlueNotes } from "../../lib/blue-notes";
import { escapeXml } from "../../lib/xml";

export const GET = async ({ site }: { site: URL }): Promise<Response> => {
  const notes = await getBlueNotes();
  const blogUrl = new URL("/blog/", site).href;
  const items = notes
    .map((note) => {
      const url = new URL(blueNoteHref(note), site).href;

      return `<item>
      <title>${escapeXml(note.data.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${note.data.publishedAt.toUTCString()}</pubDate>
      <description>${escapeXml(note.data.summary)}</description>
      ${note.data.categories.map((category) => `<category>${escapeXml(category)}</category>`).join("\n      ")}
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>DEML Blue Notes</title>
    <link>${escapeXml(blogUrl)}</link>
    <description>Platform changes, feature releases, and architectural field notes from DEML.</description>
    <language>en-us</language>
    <lastBuildDate>${(notes[0]?.data.updatedAt ?? notes[0]?.data.publishedAt ?? new Date()).toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
};
