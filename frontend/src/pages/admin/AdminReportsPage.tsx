import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function AdminReportsPage() {
  return (
    <PagePlaceholder title="Usage and no-show reports" useCases="UC-08" endpoints={['E20 api.admin.usageReport', 'E21 api.admin.noShowReport']} />
  )
}
