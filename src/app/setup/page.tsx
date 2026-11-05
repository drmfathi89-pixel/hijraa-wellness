import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { sql } from '@/lib/db'
import { setupAdmin } from '@/app/actions/auth'
import AuthShell from '@/components/AuthShell'
import AuthForm from '@/components/AuthForm'

export const metadata = { title: 'Setup' }

export default async function SetupPage() {
  await connection()
  const [{ count }] = await sql`select count(*)::int as count from users`
  if (count > 0) redirect('/login')
  return (
    <AuthShell title="Welcome! First-time setup" subtitle="Create the administrator account for your clinic.">
      <AuthForm action={setupAdmin} submit="Create admin account" fields={[
        { name: 'name', label: 'Full name', autoComplete: 'name' },
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Password (min 8 characters)', type: 'password', autoComplete: 'new-password' },
      ]} />
    </AuthShell>
  )
}
