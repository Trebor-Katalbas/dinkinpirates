import type { Metadata } from 'next'
import { CaptainsLog } from '@/components/admin/captains-log'
import { PageHeading } from '@/components/site/page-heading'

export const metadata: Metadata = {
  title: "Captain's Log",
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <PageHeading title="Captain's Log" eyebrow="Owner dashboard">
        Bookings, occupancy, voyage click-through, bounty tiers, and revenue.
      </PageHeading>
      <CaptainsLog />
    </div>
  )
}
