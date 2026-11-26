import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { getResponse, type RequestHandler } from 'msw'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'

const API_PREFIX = '/api/v1'

/**
 * Phone mode only: answers /api/v1 requests inside the Vite server with the same mock handlers
 * (src/mocks/handlers.ts) that the browser uses in `npm run dev`.
 * Why: the browser mock runs in a Service Worker, and browsers refuse Service Workers on a page whose
 * certificate is not trusted. The phone test uses a self-made certificate, so the mock must run here.
 */
function phoneMockApi(): Plugin {
  return {
    name: 'campusslot-phone-mock-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
        if (!req.url?.startsWith(API_PREFIX + '/')) return next()
        try {
          // Loaded through Vite, so the TypeScript and import.meta.env in the handlers work here too.
          const { handlers } = (await server.ssrLoadModule('/src/mocks/handlers.ts')) as { handlers: RequestHandler[] }
          const origin = `https://${req.headers.host ?? 'localhost'}`
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const request = new Request(origin + req.url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
            duplex: hasBody ? 'half' : undefined,
          } as RequestInit)

          const response =
            (await getResponse(handlers, request, { baseUrl: origin })) ??
            Response.json({ error: { code: 'NOT_FOUND', message: 'No mock for this endpoint yet.' } }, { status: 404 })

          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
// `npm run dev:phone` uses mode "phone" for testing the QR check-in on a phone (H23):
// - HTTPS with a self-signed certificate, because a phone's browser gives the camera only to a secure page;
// - host: true, so the phone can open https://<this computer's IP>:5173 on the same Wi-Fi;
// - the API address is relative (/api/v1, same address as the page) and is answered by phoneMockApi() above,
//   so the browser's Service Worker mock is switched off. When the real backend exists, phone mode needs
//   a Vite proxy to it instead: [TBD with Erol, H19].
export default defineConfig(({ mode }) => {
  const phone = mode === 'phone'
  return {
    plugins: [react(), ...(phone ? [basicSsl(), phoneMockApi()] : [])],
    server: phone ? { host: true } : undefined,
    define: phone
      ? {
          'import.meta.env.VITE_API_URL': JSON.stringify(API_PREFIX),
          'import.meta.env.VITE_USE_MOCKS': JSON.stringify('false'),
        }
      : undefined,
  }
})
