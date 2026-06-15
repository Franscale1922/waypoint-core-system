import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/app/lib/og";
import { industries, getIndustry } from "@/data/industries";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Franchise Industry"
        title={industry ? `${industry.name} Franchises` : "Franchise Industries"}
        tagline={industry?.heroTagline}
      />
    ),
    { ...OG_SIZE },
  );
}
