import { BrowserQRCodeSvgWriter } from '@zxing/browser'
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { DEMO_DOOR } from '../../mocks/db'

// Development only (H23): shows a door QR code on the computer screen, so a phone can scan it
// on the Check-in page. Not part of the app; the route exists only in `npm run dev*`.
// - /dev/qr-test                                   the mock API's demo door
// - /dev/qr-test?text=<qrToken>&name=<room>&code=<6 digits>   a real door from the backend
//   (an admin sees qrToken and checkInCode in GET /admin/resources, E17)

export default function QrTestPage() {
  const [params] = useSearchParams()
  const text = params.get('text') ?? DEMO_DOOR.qrToken
  const name = params.get('name') ?? DEMO_DOOR.resource.name
  const code = params.get('code') ?? DEMO_DOOR.checkInCode
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    box.replaceChildren(new BrowserQRCodeSvgWriter().write(text, 260, 260))
  }, [text])

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Test QR code (development)</h1>
        <p>Scan this with the Check-in page on your phone.</p>
        <div ref={boxRef} className="dev-qr" />
        <p>
          {name} · 6-digit code: <strong>{code}</strong>
        </p>
        <p className="field-hint">QR text: {text}</p>
      </div>
    </main>
  )
}
