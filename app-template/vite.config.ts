import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Connect, type Plugin, type PreviewServer, type ViteDevServer } from "vite";
// @ts-expect-error -- plain ESM helper with no type declarations, shared with tools/serve-docs.mjs
import { renderApiDocs } from "./tools/docs-page.mjs";

/**
 * Serves API.md at /api-docs, rendered, from the app's own dev server.
 *
 * The sidebar links there, so the data boundary is one click away whenever the
 * app is running — no second command to remember and no dead link. Reading it
 * without the app is still `npm run docs`, which serves the identical page on
 * port 3001.
 */
function apiDocs(): Plugin {
  const handler: Connect.NextHandleFunction = (_request, response, next) => {
    void (async () => {
      const html: string | null = await renderApiDocs(process.cwd());
      if (html === null) {
        next();
        return;
      }
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(html);
    })();
  };
  return {
    name: "api-docs",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api-docs", handler);
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use("/api-docs", handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiDocs()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
  },
});
