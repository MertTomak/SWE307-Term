import { Link } from 'react-router'
import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function LoginPage() {
  return (
    <PagePlaceholder title="Log in" useCases="UC-01" endpoints={['E02 api.auth.login (via useAuth().login)']}>
      <p>No account yet? <Link to="/register">Register</Link></p>
    </PagePlaceholder>
  )
}
