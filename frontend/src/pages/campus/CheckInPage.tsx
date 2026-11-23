import { PagePlaceholder } from '../../components/PagePlaceholder'

export default function CheckInPage() {
  return (
    <PagePlaceholder title="Check in" useCases="UC-05" endpoints={['E11 api.checkIns.create']}>
      <p>Camera scan (method QR_SCAN). If the camera does not open, a 6-digit code field on the same screen (method MANUAL_CODE).</p>
    </PagePlaceholder>
  )
}
