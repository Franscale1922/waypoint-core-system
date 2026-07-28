import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireAdminPage } from "@/lib/require-admin-page";
import { Section } from "@/components/admin/Section";
import { candidateFacingProjections } from "@/lib/match-workspace/projection";
import { brandDisplayName } from "@/lib/match-workspace/brand-resolver";

export const dynamic = "force-dynamic";

/**
 * Exactly what a candidate would see for this run, and nothing else.
 *
 * This page is the reason `candidateFacingProjections` exists as a single function: [C-16] is only
 * meaningful if there is ONE query that defines the candidate-facing surface, and everything that
 * shows candidate-facing text goes through it. A reviewer correctly flagged that the function had
 * no caller outside its tests, which made the boundary theoretical.
 *
 * It reads no score, no rank, no confidence and no flag. A brand disappears from here the moment
 * its confirmed decision is superseded, and its text disappears when the candidate is redacted.
 * Access is still admin-gated: this is Kelsey checking what would go out, not a candidate portal.
 */
export default async function CandidateView({ params }: { params: Promise<{ runId: string }> }) {
  await requireAdminPage();
  const { runId } = await params;

  const visible = await candidateFacingProjections(prisma, runId);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <Link
        href={`/admin/match-workspace/${runId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to the worksheet
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Candidate view</h1>
        <p className="text-sm text-slate-500 mt-1">
          Everything below is what the candidate would see, read through the one query that defines
          that boundary. No score, rank, confidence or flag can appear here.
        </p>
      </div>

      {visible.length === 0 ? (
        <Section icon={<Eye className="w-4 h-4 text-slate-400" />} title="Nothing to show yet">
          <p className="text-sm text-slate-500">
            No confirmed brand on this run has candidate-facing text. Add it on the worksheet, on a
            brand you have confirmed to the final slate.
          </p>
        </Section>
      ) : (
        visible.map((b) => (
          <Section
            key={b.waypointBrandId}
            icon={<Eye className="w-4 h-4 text-emerald-500" />}
            title={brandDisplayName(b.waypointBrandId)}
          >
            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{b.bodyText}</p>
          </Section>
        ))
      )}
    </div>
  );
}
