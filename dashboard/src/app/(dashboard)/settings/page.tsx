import SettingsClient from '@/components/SettingsClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'System Settings',
  description: 'Manage AES-256-CBC Vault keys and neural provider handshake.',
  robots: 'noindex, nofollow',
}

export default function SettingsPage() {
  return <SettingsClient />
}
