import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function MyReservationsPage() {
  return (
    <PagePlaceholder title="My reservations" useCases="UC-10, UC-04" endpoints={['E08 api.reservations.mine', 'E10 api.reservations.cancel', 'E03 api.auth.me (penalty end date)']}>
      <p>Coloured badge for each of the 7 statuses.</p>
    </PagePlaceholder>
  )
}
