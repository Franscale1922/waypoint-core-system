"use client";

import dynamic from "next/dynamic";

// Loading skeleton — matches the dark bg and layout of FranchiseMap section
// so the page never shows a blank void while the component hydrates
function MapSkeleton() {
  return (
    <section className="py-16 sm:py-24 md:py-32 bg-[#0c1929] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <div className="h-3 w-28 bg-[#1b3a5f] rounded mx-auto mb-6 animate-pulse" />
          <div className="h-8 w-80 bg-[#1b3a5f] rounded mx-auto animate-pulse" />
        </div>
        <div className="relative w-full max-w-4xl mx-auto aspect-[960/600] bg-[#122640] rounded-xl animate-pulse" />
        <div className="mt-8 sm:mt-12 text-center">
          <div className="h-3 w-64 bg-[#1b3a5f] rounded mx-auto animate-pulse" />
        </div>
      </div>
    </section>
  );
}

const FranchiseMap = dynamic(() => import("./FranchiseMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export default function FranchiseMapWrapper() {
  return <FranchiseMap />;
}

