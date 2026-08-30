#!/usr/bin/env node
/**
 * Serves API.md on its own port, for reading the data boundary without the app
 * running: `npm run docs`, then open http://localhost:3001.
 *
 * The app serves the same page at /api-docs while `npm run dev` is up, which
 * is where the sidebar link points — so the link always resolves and this
 * server is the standalone convenience, not a prerequisite. Separate port on
 * purpose: 3000 belongs to the app, and the harness checks that nothing else
 * listens there.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderApiDocs } from "./docs-page.mjs";

const appRoot = process.cwd();
const flag = process.argv.indexOf("--port");
const port = Number(process.env.PORT ?? (flag === -1 ? undefined : process.argv[flag + 1]) ?? 3001);

const server = createServer(async (request, response) => {
  if (request.url === "/favicon.svg") {
    try {
      const icon = await readFile(path.join(appRoot, "public", "favicon.svg"));
      response.writeHead(200, { "content-type": "image/svg+xml" });
      response.end(icon);
    } catch {
      response.writeHead(404).end();
    }
    return;
  }

  const html = await renderApiDocs(appRoot);
  if (html === null) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("No API.md in this app.");
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`API docs on http://localhost:${port} (Ctrl-C to stop)`);
});
