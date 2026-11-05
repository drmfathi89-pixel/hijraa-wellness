import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { login } from '@/app/actions/auth'
import AuthShell from '@/components/AuthShell'
import AuthForm from '@/components/AuthForm'

export const metadata = { title: 'Login' }

export default async function LoginPage() {
  if (await getUser()) redirect('/')
  const [{ count }] = await sql`select count(*)::int as count from users`
  if (count === 0) redirect('/setup')
  return (
    <AuthShell title="Sign in" subtitle="Use your clinic account">
      <AuthForm action={login} submit="Sign in" fields={[
        { name: 'username', label: 'Username', autoComplete: 'username' },
        { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' },
      ]} />
      <p className="mt-4 text-center text-xs text-slate-400">Forgot password? Ask your clinic admin.</p>
    </AuthShell>
  )
}
