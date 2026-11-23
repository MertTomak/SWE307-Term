import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function NotificationsPage() {
  return (
    <PagePlaceholder title="Notifications" useCases="UC-10" endpoints={['E12 api.notifications.list', 'E13 api.notifications.markRead']} />
  )
}
