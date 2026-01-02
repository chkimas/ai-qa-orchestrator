import CrawlerClient from '@/components/CrawlerClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Autonomous Recon',
  description: 'Deploy scout drones for site architecture mapping.',
  robots: 'noindex, nofollow',
}

export default function ReconScoutPage() {
  return <CrawlerClient />
}
