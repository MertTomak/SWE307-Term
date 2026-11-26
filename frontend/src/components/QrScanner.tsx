import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { useEffect, useRef, useState } from 'react'

// Camera QR scanner for the Check-in page (UC-05, method QR_SCAN). Library choice: H23, 5.8.2.
// The browser gives the camera only to a secure page (HTTPS, or http://localhost on the same computer).

interface QrScannerProps {
  /** Called once with the text of the first QR code that is read. The camera stops after that. */
  onScan: (text: string) => void
  /** false = camera off (for example while the check-in request is being sent). */
  active: boolean
}

/** True when this browser can open a camera on this page at all. */
function cameraPossible(): boolean {
  return window.isSecureContext && typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/** Turns the browser's camera error into a sentence for the user. */
function cameraProblem(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return 'Camera access was blocked. Allow the camera for this site, or type the 6-digit code below.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera was found. Type the 6-digit code below.'
  if (name === 'NotReadableError') return 'The camera is used by another app. Close it, or type the 6-digit code below.'
  return 'The camera could not be started. Type the 6-digit code below.'
}

export function QrScanner({ onScan, active }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [problem, setProblem] = useState<string | null>(
    cameraPossible() ? null : 'This page cannot use the camera (it needs HTTPS). Type the 6-digit code below.',
  )
  const [running, setRunning] = useState(false)

  // Keep the latest onScan without restarting the camera every time the parent renders.
  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  })

  // Camera starts run one after another. Why: the library's stop() also empties the <video> element.
  // If an old start is stopped after a new start has put its picture there, the screen goes black.
  // This happens in development, where React StrictMode runs every effect twice (start, clean up, start).
  const previousRun = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    const video = videoRef.current
    if (!active || !video || !cameraPossible()) return

    let finished = false // set by the first result or by the clean-up below
    let controls: IScannerControls | null = null
    // Try to read a frame every 200 ms: fast enough for a person, light on the phone's battery.
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 200 })

    // Wait until the previous camera is fully stopped, then start this one.
    const run = previousRun.current.then(async () => {
      if (finished) return // cleaned up before it could start: do not ask for the camera at all
      try {
        const started = await reader.decodeFromConstraints(
          // "environment" = the back camera of a phone. A laptop has only one camera and uses that.
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          video,
          (result, _error, scanControls) => {
            // Called for every frame. `result` is undefined while no QR code is in the picture.
            if (!result || finished) return
            finished = true
            scanControls.stop()
            setRunning(false)
            onScanRef.current(result.getText())
          },
        )
        if (finished) started.stop() // the page was left (or a code was read) before the camera was ready
        else {
          controls = started
          setRunning(true)
          setProblem(null)
        }
      } catch (error) {
        if (!finished) setProblem(cameraProblem(error))
      }
    })

    // Clean-up: runs when `active` turns false or the page is left. Turns the camera light off.
    // The next start waits for this stop (previousRun).
    return () => {
      finished = true
      setRunning(false)
      previousRun.current = run.then(() => controls?.stop())
    }
  }, [active])

  return (
    <div className="qr-scanner">
      {/* playsInline: without it, iPhone Safari opens the video full screen. muted: allows autoplay. */}
      <video ref={videoRef} className="qr-video" muted playsInline aria-label="Camera picture" />
      <div className="qr-frame" aria-hidden="true" />
      <p className="qr-caption" role="status">
        {problem ?? (running ? 'Point the camera at the QR code on the door.' : active ? 'Starting the camera…' : 'Camera paused.')}
      </p>
    </div>
  )
}
