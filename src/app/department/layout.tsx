import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentEmployee } from '@/lib/auth'

export default async function DepartmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }
  
  const employee = await getCurrentEmployee(supabase)
  
  if (!employee) {
    // If they have an auth user but no employee profile (e.g. RLS blocked it), 
    // redirecting to login causes an infinite loop with proxy.ts.
    // Instead, we show an error to help debug.
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Profile Access Error</h1>
        <p className="text-muted-foreground mb-4">
          Your account is logged in, but we couldn&apos;t fetch your Employee profile from the database. 
          This is typically caused by missing Row Level Security (RLS) policies on the <code>employees</code> table.
        </p>
        <p className="text-sm">Please ask your system administrator to configure database policies.</p>
      </div>
    )
  }

  return <>{children}</>
}
