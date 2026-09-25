'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function login(formData: FormData) {
  const supabase = await createClient()

  // typecast here is a workaround for `get` returning string | File
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const result = loginSchema.safeParse(data)
  if (!result.success) {
    return { error: 'Invalid input' }
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')

  let destination = '/department'
  if (authData?.user) {
    const { data: emp } = await supabase.from('employees').select('role').eq('auth_user_id', authData.user.id).single()
    if (emp?.role === 'SYSTEM_ADMIN') {
      destination = '/admin'
    }
  }

  redirect(destination)
}
