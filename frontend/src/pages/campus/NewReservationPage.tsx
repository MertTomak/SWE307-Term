import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function NewReservationPage() {
  return (
    <PagePlaceholder title="New reservation" useCases="UC-03" endpoints={['E07 api.reservations.create']}>
      <p>Show the backend message for rule errors (error.code RULE_R1 … RULE_R4, error.message).</p>
    </PagePlaceholder>
  )
}
