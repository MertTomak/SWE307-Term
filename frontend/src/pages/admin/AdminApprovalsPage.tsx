import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function AdminApprovalsPage() {
  return (
    <PagePlaceholder title="Equipment approvals" useCases="UC-06" endpoints={['E14 api.admin.pendingReservations', 'E15 api.admin.approve', 'E16 api.admin.reject']} />
  )
}
