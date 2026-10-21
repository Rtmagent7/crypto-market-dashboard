import { connection } from "next/server";
import type { ReactNode } from "react";

import { BriefText } from "@/components/ai/brief-text";
import { DataMeta } from "@/components/data-state/data-meta";
import { FreshnessRail } from "@/components/data-state/freshness-rail";
import { Unavailable } from "@/components/data-state/unavailable";
import { Panel } from "@/components/ui/panel";
import { getAiService } from "@/modules/ai/ai.service";

export const DISCLAIMER = "Educational summary, not financial advice.";

/** AI market brief, streamed into the shell when ready (RSC + Suspense, spec §8). */
export async function AiBrief(): Promise<ReactNode> {
  await connection();
  const envelope = await getAiService().getBrief();
  const brief = envelope.data;
  return (
    <Panel
      id="ai-brief"
      title="AI market brief"
      meta={<DataMeta envelope={envelope} />}
      rail={<FreshnessRail {...envelope} />}
      className="[grid-area:brief]"
    >
      {brief ? (
        <BriefText text={brief.text} />
      ) : (
        <Unavailable what="The market brief is" className="flex h-18 items-center tablet:h-66" />
      )}
      <p className="mt-3 text-meta text-muted">
        {DISCLAIMER}
        {brief ? (
          <span>
            {" "}
            · {brief.model} · prompt {brief.promptVersion}
          </span>
        ) : null}
      </p>
    </Panel>
  );
}
