import { StatusBadge } from './StatusBadge';
import type { Verdict } from '@/lib/api/types';

/** The only thing visible on a delivery report when it first loads. Status,
 *  plain-language summary, and the clinical disclaimer — never optional,
 *  never collapsed away (CoachLens_PRD.md §1/§2). */
export function VerdictCard({ verdict }: { verdict: Verdict }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-lg">
      <div className="mb-sm">
        <StatusBadge status={verdict.status} />
      </div>
      <p className="mb-md text-h4 leading-snug text-ink">{verdict.summary}</p>
      <p className="border-t border-line pt-sm text-small text-ink-dim">
        {verdict.clinical_disclaimer}
      </p>
    </div>
  );
}
