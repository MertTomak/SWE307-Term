import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function ResourceSearchPage() {
  return (
    <PagePlaceholder title="Find resources" useCases="UC-02" endpoints={['E04 api.resources.search', 'E06 api.resources.availability']} />
  )
}
