import { Badge } from '@/components/ui/Badge';
import { VERDICT_COPY } from '@/content/verdict-copy';
import type { DeliveryStatus } from '@/lib/api/types';

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  const copy = VERDICT_COPY[status];
  return <Badge tone={copy.tone}>{copy.label}</Badge>;
}
