import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: emp } = await supabase.from('employees').select('role').eq('auth_user_id', user.id).single();
    if (emp?.role === 'SYSTEM_ADMIN') {
      redirect("/admin");
    }
  }
  
  redirect("/department");
}
