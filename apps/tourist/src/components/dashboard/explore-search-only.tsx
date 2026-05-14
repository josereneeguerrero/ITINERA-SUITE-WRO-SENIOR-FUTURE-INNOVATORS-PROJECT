"use client";

import { useState } from "react";
import SuggestiveSearch from "@/components/ui/suggestive-search";

export function ExploreSearchOnly() {
  const [value, setValue] = useState("");

  return (
    <SuggestiveSearch
      value={value}
      onValueChange={setValue}
      effect="fade"
      suggestions={["Buscar destinos...", "Buscar por categoria...", "Buscar por region..."]}
    />
  );
}

