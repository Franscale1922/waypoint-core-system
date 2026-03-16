"use client";

import dynamic from "next/dynamic";

// Dynamic import with ssr:false must live in a Client Component.
// The page.tsx is a Server Component (it exports metadata),
// so we wrap the lazy import here and use this wrapper in the page instead.
// No loading prop to avoid hydration mismatches — map is below the fold.
const FranchiseMap = dynamic(() => import("./FranchiseMap"), {
  ssr: false,
});

export default function FranchiseMapWrapper() {
  return <FranchiseMap />;
}
