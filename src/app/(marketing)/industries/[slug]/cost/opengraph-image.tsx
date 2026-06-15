import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/app/lib/og";
import { industries, getIndustry, getIndustryCost } from "@/data/industries";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return industries.filter((i) => getIndustryCost(i.slug)).map((i) => ({ slug: i.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  const name = industry?.name ?? "a Franchise";
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Franchise Cost"
        title={`How much does a ${name} franchise cost?`}
        tagline="Typical investment range, what drives it, and what to budget for."
      />
    ),
    { ...OG_SIZE },
  );
}
