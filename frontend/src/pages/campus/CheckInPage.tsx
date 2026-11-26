import { useState, type FormEvent } from 'react'
import { api } from '../../api/endpoints'
import { ApiError } from '../../api/client'
import type { CheckInMethod, CheckInResponse } from '../../api/types'
import { QrScanner } from '../../components/QrScanner'
import { formatTime } from '../../lib/time'

// UC-05 Check in · E11 api.checkIns.create · FR-31 to FR-37, R7 · design: 5.7_ui-05-check-in_Arzum.png
// Two ways, one request: the camera reads the door's QR token (QR_SCAN),
// or the user types the 6-digit door code (MANUAL_CODE). The server decides everything else (5.8.4.8).

const CODE_PATTERN = /^\d{6}$/

export default function CheckInPage() {
  const [cameraOn, setCameraOn] = useState(true)
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<CheckInResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function checkIn(method: CheckInMethod, value: string) {
    setSending(true)
    setError(null)
    setCameraOn(false) // no second scan while the first one is being checked
    try {
      setDone(await api.checkIns.create({ method, code: value }))
    } catch (err) {
      // CHECKIN_CODE_INVALID, NO_RESERVATION_HERE, RULE_R7_TOO_EARLY / TOO_LATE, ... all come with a sentence (5.8.4.3).
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    if (!CODE_PATTERN.test(code)) {
      setError('Enter the 6 digits written under the QR code on the door.')
      return
    }
    void checkIn('MANUAL_CODE', code)
  }

  function startAgain() {
    setDone(null)
    setError(null)
    setCode('')
    setCameraOn(true)
  }

  if (done) {
    return (
      <section className="checkin-page">
        <h1>Check in</h1>
        <div className="checkin-success" role="status">
          <p className="checkin-success-title">You are checked in</p>
          <p>
            {done.reservation.resource.name} · {formatTime(done.reservation.startTime)}–{formatTime(done.reservation.endTime)}
          </p>
          <p className="field-hint">Checked in at {formatTime(done.checkIn.checkedInAt)}.</p>
        </div>
        <button type="button" className="button-secondary button-block" onClick={startAgain}>
          Check in somewhere else
        </button>
      </section>
    )
  }

  return (
    <section className="checkin-page">
      <h1>Check in</h1>

      <QrScanner active={cameraOn && !sending} onScan={(text) => void checkIn('QR_SCAN', text)} />
      {!cameraOn && !sending && (
        <button type="button" className="button-secondary button-block" onClick={startAgain}>
          Scan again
        </button>
      )}

      <p className="divider-or">or</p>

      <form onSubmit={handleCodeSubmit} noValidate>
        <div className="field">
          <label htmlFor="door-code">Enter the 6-digit code</label>
          <input
            id="door-code"
            className="code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            // Keep digits only, so "48 29 13" or a pasted code with spaces still works.
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={sending}
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="button-primary button-block" disabled={sending}>
          {sending ? 'Checking in…' : 'Check in'}
        </button>
      </form>

      <div className="info-box">
        <p className="info-box-title">Check-in window</p>
        <p>
          Check-in opens 10 minutes before the start and closes 15 minutes after it. Without a check-in the reservation becomes
          NO_SHOW and the resource is released.
        </p>
      </div>
    </section>
  )
}
