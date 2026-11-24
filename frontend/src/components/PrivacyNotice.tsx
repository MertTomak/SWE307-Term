/**
 * KVKK Art. 10 privacy notice shown on the Register page (NFR-06, 5.8.5.5).
 * DRAFT: the final wording comes from the university's legal check (SEC-O3, Mert).
 * Facts below are taken from 5.8.5.5; replace only the text, keep this component.
 * Plain JSX text only, no dangerouslySetInnerHTML (5.8.5.2, A05).
 */
export function PrivacyNotice({ id }: { id?: string }) {
  return (
    <section id={id} className="privacy-notice" aria-labelledby="privacy-notice-title">
      <h2 id="privacy-notice-title">Privacy notice (KVKK)</h2>
      <p className="privacy-draft">Draft text. Final wording: [TBD, university legal check].</p>
      <dl>
        <dt>Data controller</dt>
        <dd>[TBD: university unit]</dd>

        <dt>What we store</dt>
        <dd>Your full name, e-mail address, role and password (only as a secure hash). When you use the system: your reservations, check-ins, no-show records, penalties and in-app notifications.</dd>

        <dt>Why</dt>
        <dd>To let you reserve campus rooms, labs and equipment, to check you in at the door, and to apply the campus reservation rules (for example the no-show penalty).</dd>

        <dt>Who sees it</dt>
        <dd>You, and the resource administrators, who need it to approve equipment requests and apply penalties. Other users never see your name.</dd>

        <dt>Your rights</dt>
        <dd>You can see your data in the app. To ask for a correction or deletion, contact [TBD: contact point].</dd>
      </dl>
    </section>
  )
}
