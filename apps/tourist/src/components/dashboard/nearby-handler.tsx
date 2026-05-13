"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// When ?nearby=true is in URL, get browser location and redirect to /explore?lat=X&lng=Y
export function NearbyHandler() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  useEffect(() => {
    if (searchParams.get("nearby") !== "true") return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        router.replace(`/explore?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`);
      },
      () => {
        // User denied or error — just remove the param
        router.replace("/explore");
      }
    );
  }, [searchParams, router]);

  return null;
}
