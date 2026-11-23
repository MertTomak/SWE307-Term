import type { ReactNode } from 'react'

interface Props {
  title: string
  useCases: string
  endpoints: string[]
  children?: ReactNode
}

/**
 * Temporary body of a screen that is not built yet.
 * Replace it with the real screen (design: Arzum, code: Enes).
 */
export function PagePlaceholder({ title, useCases, endpoints, children }: Props) {
  return (
    <section className="placeholder">
      <h1>{title}</h1>
      <p className="placeholder-note">Screen not built yet. Use cases: {useCases}</p>
      <h2>API calls (src/api/endpoints.ts)</h2>
      <ul>
        {endpoints.map((endpoint) => (
          <li key={endpoint}>
            <code>{endpoint}</code>
          </li>
        ))}
      </ul>
      {children}
    </section>
  )
}
