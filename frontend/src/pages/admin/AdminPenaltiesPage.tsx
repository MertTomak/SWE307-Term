import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function AdminPenaltiesPage() {
  return (
    <PagePlaceholder title="Penalties" useCases="UC-08 (F8)" endpoints={['E22 api.admin.penalties']} />
  )
}
