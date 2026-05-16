import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin")) {
    redirect("/login?error=unauthorized");
  }

  // Fetch pending review count for sidebar badge
  const { count: pendingReviews } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("moderation_status", "pending");

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0A0F0F" }}>
      <Sidebar
        pendingReviews={pendingReviews ?? 0}
        userEmail={user.email}
        userRole={profile.role}
      />
      <main className="flex-1 min-w-0 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
