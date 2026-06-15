import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, OG_ALT, OG_CONTENT_TYPE } from "@/app/lib/og";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="Franchise Categories"
        title="The major franchise categories, explained"
        tagline="Home services, senior care, fitness, food, B2B and more — what each is really like and who it fits."
      />
    ),
    { ...OG_SIZE },
  );
}
