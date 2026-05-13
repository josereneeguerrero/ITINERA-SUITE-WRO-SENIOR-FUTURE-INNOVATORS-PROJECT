"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, X } from "lucide-react";

export function SearchInput({ placeholder = "Buscar..." }: { placeholder?: string }) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const value = searchParams.get("q") ?? "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (e.target.value) {
        params.set("q", e.target.value);
      } else {
        params.delete("q");
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="relative flex-1 max-w-xs">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
        style={{ color: isPending ? "#0D9488" : "#6B7280" }}
      />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 h-8 rounded-lg font-inter text-sm text-white placeholder:text-[#374151] bg-[#0A0F0F] border border-[#1F2937] outline-none focus:border-[#0D9488] transition-all"
      />
      {value && (
        <button
          onClick={clear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
          style={{ color: "#6B7280" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
