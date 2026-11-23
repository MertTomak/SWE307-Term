import { Link } from 'react-router'
import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function RegisterPage() {
  return (
    <PagePlaceholder title="Register" useCases="UC-01" endpoints={['E01 api.auth.register (via useAuth().register)']}>
      <p>Show the KVKK privacy notice here (NFR-06). Already registered? <Link to="/login">Log in</Link></p>
    </PagePlaceholder>
  )
}
