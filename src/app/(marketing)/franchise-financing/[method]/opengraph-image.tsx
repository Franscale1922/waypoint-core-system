import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/app/lib/og";
import { financingGuides, getFinancingGuide } from "@/data/financing";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return financingGuides.map((g) => ({ method: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ method: string }> }) {
  const { method } = await params;
  const guide = getFinancingGuide(method);
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Franchise Financing"
        title={guide ? guide.name : "Franchise Financing"}
        tagline={guide?.heroTagline}
      />
    ),
    { ...OG_SIZE },
  );
}
