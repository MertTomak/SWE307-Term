import { BrowserQRCodeSvgWriter } from '@zxing/browser'
import { useEffect, useRef } from 'react'
import { DEMO_DOOR } from '../../mocks/db'

// Development only (H23): shows the demo door's QR code on the computer screen,
// so a phone can scan it on the Check-in page. Not part of the app; the route exists only in `npm run dev`.

export default function QrTestPage() {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const svg = new BrowserQRCodeSvgWriter().write(DEMO_DOOR.qrToken, 260, 260)
    box.replaceChildren(svg)
  }, [])

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Test QR code (development)</h1>
        <p>Scan this with the Check-in page on your phone.</p>
        <div ref={boxRef} className="dev-qr" />
        <p>
          {DEMO_DOOR.resource.name} · 6-digit code: <strong>{DEMO_DOOR.checkInCode}</strong>
        </p>
        <p className="field-hint">QR text: {DEMO_DOOR.qrToken}</p>
      </div>
    </main>
  )
}
