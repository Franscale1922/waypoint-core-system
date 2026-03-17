"use client";
import { useState } from "react";

/**
 * VimeoFacade — D-8 CRO
 *
 * Click-to-load Vimeo embed. Shows a static poster image (zero video overhead)
 * until the visitor clicks play, then loads the Vimeo iframe.
 *
 * Performance notes:
 * - No iframe is rendered until click → no Vimeo JS bundle on initial load
 * - Poster image is a standard <img> — near-zero paint cost
 * - Vimeo CDN handles adaptive streaming; no video bytes hit Vercel
 */
export default function VimeoFacade({
  videoId,
  title = "Watch the video",
  aspectRatio = "16/9",
}: {
  videoId: string;
  title?: string;
  aspectRatio?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-[#0c1929] shadow-xl"
      style={{ aspectRatio }}
    >
      {playing ? (
        <iframe
          src={`https://player.vimeo.com/video/${videoId}?autoplay=1&color=d4a55a&title=0&byline=0&portrait=0`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title}
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <>
          {/* Poster: Vimeo's thumbnail endpoint */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://vumbnail.com/${videoId}.jpg`}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          {/* Dark overlay for contrast */}
          <div className="absolute inset-0 bg-black/30" />
          {/* Play button */}
          <button
            onClick={() => setPlaying(true)}
            aria-label={`Play: ${title}`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 group"
          >
            {/* Gold play circle */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#C8622E] group-hover:bg-[#D4724A] flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-110">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="#0c1929"
                className="w-7 h-7 sm:w-9 sm:h-9 ml-1"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-white/90 text-sm font-medium tracking-wide">
              {title}
            </span>
          </button>
        </>
      )}
    </div>
  );
}
