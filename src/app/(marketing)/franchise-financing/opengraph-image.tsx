import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/app/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Funding Guide"
        title="How to Finance a Franchise"
        tagline="SBA loans, ROBS, home equity, securities-backed lines, and franchisor financing, in plain English."
      />
    ),
    { ...OG_SIZE },
  );
}
