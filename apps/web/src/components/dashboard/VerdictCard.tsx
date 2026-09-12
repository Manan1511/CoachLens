import { StatusBadge } from './StatusBadge';
import type { Verdict } from '@/lib/api/types';

/** The only thing visible on a delivery report when it first loads. Status,
 *  plain-language summary, and the clinical disclaimer — never optional,
 *  never collapsed away (CoachLens_PRD.md §1/§2). A typographic statement,
 *  not a bordered card — the page itself is the container. */
export function VerdictCard({ verdict }: { verdict: Verdict }) {
  return (
    <div className="mb-md">
      <div className="mb-sm">
        <StatusBadge status={verdict.status} />
      </div>
      <p className="mb-md text-h3 leading-snug text-ink">{verdict.summary}</p>
      <p className="text-small text-ink-dim">{verdict.clinical_disclaimer}</p>
    </div>
  );
}
