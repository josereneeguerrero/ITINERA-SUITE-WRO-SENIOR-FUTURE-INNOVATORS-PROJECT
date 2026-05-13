import { redirect } from "next/navigation";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; guest?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => typeof value === "string")
  ).toString();
  redirect(`/dashboard${query ? `?${query}` : ""}`);
}
