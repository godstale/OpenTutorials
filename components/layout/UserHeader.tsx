import Link from 'next/link';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ROUTES } from '@/lib/constants/routes';

export async function UserHeader() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initial = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-6 justify-between">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2" />
      </div>
      <div className="flex items-center gap-4">
        <Link href={ROUTES.SETTINGS}>

          <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">{initial}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
