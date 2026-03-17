"use client";
import { useState } from "react";

/**
 * VimeoFacade — D-8 CRO
 *
 * Click-to-load Vimeo embed. Shows a static poster image (zero video overhead)
 * until the visitor clicks play, then loads the Vimeo iframe.
 *
 * Text is anchored bottom-left (label + short headline) — never wraps at any width.
 */
export default function VimeoFacade({
  videoId,
  thumbnailUrl,
  label = "Watch",
  headline = "Hear it from Kelsey",
  title = "Watch the video",
  aspectRatio = "16/9",
}: {
  videoId: string;
  thumbnailUrl?: string;
  label?: string;
  headline?: string;
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
          src={`https://player.vimeo.com/video/${videoId}?autoplay=1&color=CC6535&title=0&byline=0&portrait=0`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title}
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <>
          {/* Poster thumbnail */}
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          )}

          {/* Gradient scrim — bottom only, keeps thumbnail bright at top */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Clickable overlay — entire card is the play target */}
          <button
            onClick={() => setPlaying(true)}
            aria-label={`Play: ${title}`}
            className="absolute inset-0 group"
          >
            {/* Centred play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#CC6535]/90 group-hover:bg-[#CC6535] flex items-center justify-center shadow-xl transition-all duration-200 group-hover:scale-110">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="white"
                  className="w-7 h-7 sm:w-9 sm:h-9 ml-1"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Bottom-left text — fixed two lines, never wraps */}
            <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-5 pb-4 sm:pb-5">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#CC6535] mb-0.5">
                {label}
              </p>
              <p className="text-white font-semibold text-sm sm:text-base leading-snug">
                {headline}
              </p>
            </div>
          </button>
        </>
      )}
    </div>
  );
}
