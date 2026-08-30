/**
 * Renders API.md as a standalone page. Imported by two callers: the Vite dev
 * server, which serves it at /api-docs so the app's own sidebar link always
 * resolves, and tools/serve-docs.mjs, which serves the same page on its own
 * port for reading without the app running.
 *
 * No dependency and no network. The converter covers exactly what API.md uses
 * — headings, fenced code, tables, lists, inline code, links, emphasis.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const CODE_OPEN = "@@code";
const CODE_CLOSE = "@@";

function escapeHtml(text) {
  return text
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

/**
 * Inline spans. Backticked code is lifted out first and put back last, so a
 * `|` or a `<` inside it is never treated as table or tag syntax.
 */
function inline(text) {
  const codes = [];
  let out = text.replace(/`([^`]+)`/gu, (_match, code) => {
    // A table cell escapes its pipes; inside a code span the backslash is not
    // part of what the reader is meant to see.
    codes.push(code.replace(/\\\|/gu, "|"));
    return `${CODE_OPEN}${codes.length - 1}${CODE_CLOSE}`;
  });
  out = escapeHtml(out)
    .replace(/\\\|/gu, "|")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gu, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>");
  return out.replace(/@@code(\d+)@@/gu, (_match, index) => `<code>${escapeHtml(codes[Number(index)])}</code>`);
}

function tableCells(row) {
  return row
    .replace(/^\||\|$/gu, "")
    .split(/(?<!\\)\|/u)
    .map((cell) => cell.trim());
}

function renderTable(rows) {
  const head = tableCells(rows[0]);
  const body = rows.slice(2).map(tableCells);
  return [
    "<table><thead><tr>",
    head.map((cell) => `<th>${inline(cell)}</th>`).join(""),
    "</tr></thead><tbody>",
    body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join(""),
    "</tbody></table>",
  ].join("");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/u);
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.startsWith("```")) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/u.exec(line);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(lines[index].trim());
        index += 1;
      }
      html.push(rows.length > 2 ? renderTable(rows) : `<p>${inline(rows.join(" "))}</p>`);
      continue;
    }

    if (/^\s*[-*]\s+/u.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*]\s+/u.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/u, ""));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !lines[index].startsWith("```") &&
      !lines[index].trim().startsWith("|") &&
      !/^#{1,4}\s/u.test(lines[index]) &&
      !/^\s*[-*]\s+/u.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    html.push(`<p>${inline(paragraph.join(" "))}</p>`);
  }

  return html.join("\n");
}

/** The app's tokens, inlined: this page is served without the app's stylesheet. */
function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<title>${escapeHtml(title)} API</title>
<style>
:root {
  --ink: #101828; --ink-soft: #6a7282; --surface: #ffffff; --surface-sunk: #f9fafb;
  --line: #e5e7eb; --accent: #4f39f6;
  --font: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #ffffff; --ink-soft: #99a1af; --surface: #101828; --surface-sunk: #1e2939;
    --line: #364153; --accent: #7c86ff;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 3rem 1.5rem 6rem; font-family: var(--font); font-size: 16px;
  line-height: 1.6; color: var(--ink); background: var(--surface);
}
main { max-width: 46rem; margin: 0 auto; }
.brand { display: flex; align-items: center; gap: .75rem; margin-bottom: 2.5rem; }
.brand svg { width: 2rem; height: 2rem; color: var(--accent); }
.brand b { font-size: .875rem; font-weight: 600; }
.brand span { font-size: .875rem; color: var(--ink-soft); }
h1 { font-size: 1.5rem; letter-spacing: -.02em; margin: 0 0 1rem; }
h2 { font-size: 1.125rem; letter-spacing: -.01em; margin: 2.5rem 0 .75rem; padding-top: 1.5rem; border-top: 1px solid var(--line); }
h3 { font-size: 1rem; margin: 1.75rem 0 .5rem; }
p { margin: 0 0 1rem; }
ul { margin: 0 0 1rem; padding-left: 1.25rem; }
li { margin-bottom: .25rem; }
a { color: var(--accent); }
code { font-family: var(--mono); font-size: .85em; background: var(--surface-sunk); border: 1px solid var(--line); border-radius: 4px; padding: .1em .3em; }
pre { background: var(--surface-sunk); border: 1px solid var(--line); border-radius: 8px; padding: 1rem; overflow-x: auto; }
pre code { background: none; border: 0; padding: 0; font-size: .85rem; line-height: 1.5; }
table { width: 100%; border-collapse: collapse; margin: 0 0 1.5rem; font-size: .9rem; display: block; overflow-x: auto; }
th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-weight: 600; white-space: nowrap; }
</style>
</head>
<body>
<main>
  <div class="brand">
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 2h12a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H10a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8Zm-0.5 7.5h13a1.5 1.5 0 0 1 0 3h-13a1.5 1.5 0 0 1 0-3Zm0 5h13a1.5 1.5 0 0 1 0 3h-13a1.5 1.5 0 0 1 0-3Zm0 5h7a1.5 1.5 0 0 1 0 3h-7a1.5 1.5 0 0 1 0-3ZM21 19.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z"/></svg>
    <b>${escapeHtml(title)}</b><span>API</span>
  </div>
${body}
</main>
</body>
</html>
`;
}

async function productName(appRoot) {
  try {
    const parameters = JSON.parse(await readFile(path.join(appRoot, "parameters.json"), "utf8"));
    return String(parameters.product?.name ?? "This app");
  } catch {
    return "This app";
  }
}

/** The finished HTML for an app root, or null when it has no API.md. */
export async function renderApiDocs(appRoot) {
  let markdown;
  try {
    markdown = await readFile(path.join(appRoot, "API.md"), "utf8");
  } catch {
    return null;
  }
  return page(await productName(appRoot), markdownToHtml(markdown));
}
