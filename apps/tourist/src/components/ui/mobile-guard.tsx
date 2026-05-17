"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const MOBILE_ALLOWED = ["/mobile"];

function isMobile(): boolean {
  return /android|iphone|ipad|ipod|blackberry|windows phone|opera mini|mobile/i
    .test(navigator.userAgent);
}

export function MobileGuard() {
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isMobile() && !MOBILE_ALLOWED.includes(pathname)) {
      router.replace("/mobile");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
