export const runtime = "nodejs";

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#202822"/>
  <path d="M18 42V20h9.8c5.1 0 8.6 2.7 8.6 7.1 0 2.5-1.2 4.5-3.4 5.7L40 42h-6.7l-5.9-8.1H24v8.1h-6Zm6-13h3.9c2.4 0 3.8-1.1 3.8-3s-1.4-3-3.8-3H24v6Zm20 13V20h6v22h-6Z" fill="#fffaf1"/>
  <circle cx="49" cy="17" r="5" fill="#9fc7b5"/>
</svg>`;

export function GET() {
  return new Response(favicon, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/svg+xml"
    }
  });
}
