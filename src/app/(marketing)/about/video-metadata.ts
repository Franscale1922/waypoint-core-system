/**
 * Identity and pinned metadata for the single video on the About page.
 *
 * VIDEO_ID and VIMEO_FALLBACK live in one file on purpose: the pinned values
 * describe THAT id specifically, and keeping them apart is how they drift into
 * describing a video the page no longer embeds.
 */

export type VimeoMeta = {
  thumbnailUrl?: string;
  uploadDate?: string; // ISO 8601 date (required by schema.org VideoObject)
  duration?: string; // ISO 8601 duration, e.g. PT3M12S
  title?: string;
  description?: string;
};

export const VIDEO_ID = "1174270863";

/**
 * Last known-good Vimeo oEmbed values for VIDEO_ID, captured 2026-08-04.
 *
 * Why these are pinned rather than always fetched:
 *
 * The About page is statically regenerated every hour and used to read every
 * VideoObject property straight off a live oEmbed call. getVimeoMeta returns {}
 * on a non-ok response AND on any throw, which failed the uploadDate/thumbnail
 * pre-check and dropped the ENTIRE VideoObject. So a single Vimeo 503 during one
 * regeneration replaced a good page with one carrying no video structured data,
 * and that degraded page was then served for up to the next hour.
 *
 * Next's ISR would normally absorb exactly this. Its docs are explicit: "If an
 * error is thrown while attempting to revalidate data, the last successfully
 * generated data will continue to be served from the cache." But getVimeoMeta
 * CATCHES, so the render succeeds and Next caches the degraded page. The safety
 * net never fires, because from Next's side nothing went wrong.
 *
 * Deleting that catch is not the fix. This page is prerendered during
 * `next build`, where there is no previously cached render to fall back on, so a
 * Vimeo blip would fail the production deploy instead of degrading one page. The
 * same hole exists at runtime on any cache miss (fresh instance, evicted entry):
 * "the last successfully generated data" only helps when some exists.
 *
 * Pinning avoids both failure modes. A published video's upload date and
 * duration are immutable facts, and the thumbnail URL was already hardcoded on
 * this page for the player facade. Live oEmbed still wins whenever it answers;
 * these values only fill the gaps when it does not.
 *
 * Keep in step with the LIVE fixture in tests/unit/structured-data.test.ts. A
 * test asserts the two still agree and that these values still satisfy
 * videoObjectSchema, so a typo here cannot silently drop the node again.
 */
export const VIMEO_FALLBACK: Required<
  Pick<VimeoMeta, "thumbnailUrl" | "uploadDate" | "duration">
> = {
  thumbnailUrl:
    "https://i.vimeocdn.com/video/2134803942-aaf25817575a9a51d5162ec0b3de4af5986faedf1bfb3597e853e15e9d09f1bb-d_1280?region=us",
  uploadDate: "2026-03-17T01:57:41Z",
  duration: "PT3M24S",
};
