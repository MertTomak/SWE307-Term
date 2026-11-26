import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// `npm run dev:phone` uses mode "phone" for testing the QR check-in on a phone (H23):
// - HTTPS with a self-signed certificate, because a phone's browser gives the camera only to a secure page;
// - host: true, so the phone can open https://<this computer's IP>:5173 on the same Wi-Fi;
// - the API address becomes relative (same address as the page) and the mock API is on, so the requests
//   never leave the phone. When the real backend exists, this needs a Vite proxy to it: [TBD with Erol, H19].
export default defineConfig(({ mode }) => {
  const phone = mode === 'phone'
  return {
    plugins: [react(), ...(phone ? [basicSsl()] : [])],
    server: phone ? { host: true } : undefined,
    define: phone
      ? {
          'import.meta.env.VITE_API_URL': JSON.stringify('/api/v1'),
          'import.meta.env.VITE_USE_MOCKS': JSON.stringify('true'),
        }
      : undefined,
  }
})
