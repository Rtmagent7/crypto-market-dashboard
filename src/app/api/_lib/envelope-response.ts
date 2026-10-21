import type { DataEnvelope } from "@/modules/shared/domain";

const SWR_SECONDS = 60;

/**
 * DataEnvelope → HTTP. The CDN may keep a response exactly until the data's own
 * nextRefreshAt, so Vercel's edge absorbs traffic and functions run ~once per TTL.
 */
export const envelopeResponse = <T>(
  envelope: DataEnvelope<T>,
  now: number = Date.now(),
): Response => {
  const secondsLeft = Math.max(1, Math.ceil((Date.parse(envelope.nextRefreshAt) - now) / 1000));

  if (envelope.status === "unavailable") {
    return Response.json(envelope, {
      status: 503,
      headers: { "cache-control": "no-store", "retry-after": String(secondsLeft) },
    });
  }
  return Response.json(envelope, {
    status: 200,
    headers: {
      "cache-control": `public, max-age=0, s-maxage=${secondsLeft}, stale-while-revalidate=${SWR_SECONDS}`,
    },
  });
};
