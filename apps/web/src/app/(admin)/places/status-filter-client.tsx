"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function StatusFilterClient({
  current,
  options,
}: {
  current?: string;
  options: { value: string; label: string }[];
}) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("status", e.target.value);
    } else {
      params.delete("status");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={current ?? ""}
      onChange={handleChange}
      className="h-8 px-3 rounded-lg font-inter text-xs bg-transparent border border-[#1F2937] outline-none focus:border-[#0D9488] transition-all cursor-pointer"
      style={{ color: "#6B7280" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
