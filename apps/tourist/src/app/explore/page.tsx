import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; guest?: string }>;
}) {
  const { guest } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGuest = !user && guest === "true";

  if (!user && !isGuest) {
    redirect("/bienvenida?redirect=/explore");
  }

  return <main className="min-h-screen w-full bg-white" />;
}
