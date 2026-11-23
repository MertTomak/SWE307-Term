import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function ResourceDetailPage() {
  return (
    <PagePlaceholder title="Resource and availability" useCases="UC-02" endpoints={['E05 api.resources.get', 'E06 api.resources.availability']} />
  )
}
