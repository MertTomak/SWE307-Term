import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function AdminResourcesPage() {
  return (
    <PagePlaceholder title="Manage resources" useCases="UC-07" endpoints={['E17 api.admin.resources', 'E18 api.admin.createResource', 'E19 api.admin.updateResource']}>
      <p>Show the door QR code (from qrToken) and the 6-digit code so the admin can print them.</p>
    </PagePlaceholder>
  )
}
