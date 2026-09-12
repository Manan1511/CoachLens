import { Link, useParams } from 'react-router';
import { ActionBar } from '@/components/dashboard/ActionBar';
import { EvidenceDisclosure } from '@/components/dashboard/EvidenceDisclosure';
import { NudgeFfsControl } from '@/components/dashboard/NudgeFfsControl';
import { VerdictCard } from '@/components/dashboard/VerdictCard';
import { WhatsAppExport } from '@/components/dashboard/WhatsAppExport';
import { api } from '@/lib/api/client';
import { useAsync } from '@/hooks/useAsync';
import type { CoachActionType, CoachingReport } from '@/lib/api/types';

interface DeliveryAction {
  action: CoachActionType;
  note: string | null;
}

async function loadReport(
  deliveryId: string,
): Promise<{ report: CoachingReport; actioned: DeliveryAction | null } | null> {
  const [report, actioned] = await Promise.all([
    api.getReport(deliveryId),
    api.getDeliveryAction(deliveryId),
  ]);
  return report ? { report, actioned } : null;
}

export function DeliveryReportPage() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const { data, loading, error, reload } = useAsync(() => loadReport(deliveryId!), [deliveryId]);

  if (loading) return <p className="text-ink-dim">Loading report…</p>;
  if (error || !data) return <p className="text-status-red">Couldn't find that delivery.</p>;

  const { report, actioned } = data;
  const { verdict, kinematics, baselines, proposed_action } = report;
  const isSuppressed = verdict.status === 'DATA_SUPPRESSED';

  return (
    <div className="mx-auto max-w-[42rem]">
      <Link to="/app" className="mb-md inline-block text-small text-ink-dim hover:text-ink">
        ← Roster
      </Link>

      <p className="mb-sm text-caption uppercase tracking-[0.1em] text-ink-dim">
        {report.report_id}
      </p>

      <div className="flex flex-col">
        <VerdictCard verdict={verdict} />

        {!isSuppressed && (
          <EvidenceDisclosure
            kinematics={kinematics}
            baselines={baselines}
            verdict={verdict}
            defaultOpen={verdict.status === 'TECHNICAL_CONCERN'}
          />
        )}

        {kinematics.ffs_frame !== null && (
          <NudgeFfsControl
            deliveryId={report.delivery_id}
            currentFrame={kinematics.ffs_frame}
            onNudged={reload}
          />
        )}

        {/* Only TECHNICAL_CONCERN opens an action menu — MECHANICAL_WATCH is
            replay-only, FORM_BENCHMARK needs no action, and DATA_SUPPRESSED
            has nothing to act on. See CoachLens_PRD.md §8. */}
        {verdict.status === 'TECHNICAL_CONCERN' && proposed_action && (
          <ActionBar
            deliveryId={report.delivery_id}
            action={proposed_action}
            actioned={actioned?.action ?? null}
            actionNote={actioned?.note ?? null}
            onActioned={reload}
          />
        )}

        <WhatsAppExport deliveryId={report.delivery_id} />
      </div>
    </div>
  );
}
