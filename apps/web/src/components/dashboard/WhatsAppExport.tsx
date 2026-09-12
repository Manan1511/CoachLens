import { useState } from 'react';
import { api } from '@/lib/api/client';

/** Mirrors the real GET /api/v1/reports/{id}/export/whatsapp
 *  (coaching/export.py) — a genuine existing endpoint the dashboard never
 *  actually used until now. Reveals the formatted card text and lets the
 *  coach copy it, rather than trying to open WhatsApp directly (there's no
 *  reliable cross-platform way to hand text to a specific chat app from a
 *  web page). */
export function WhatsAppExport({ deliveryId }: { deliveryId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (text === null) {
      setLoading(true);
      try {
        const result = await api.exportWhatsapp(deliveryId);
        setText(result?.formatted_text ?? 'Nothing to export yet.');
      } finally {
        setLoading(false);
      }
    }
  };

  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-t border-line pt-6 pb-8">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-small font-medium text-ink">Export to WhatsApp</span>
        <span className="text-caption uppercase tracking-[0.08em] text-ink-secondary">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div className="mt-md">
          {loading || text === null ? (
            <p className="text-small text-ink-secondary">Preparing card…</p>
          ) : (
            <>
              <pre className="mb-sm whitespace-pre-wrap rounded-md border border-line bg-canvas p-3 text-small text-ink-secondary">
                {text}
              </pre>
              <button
                type="button"
                onClick={copy}
                className="rounded-full border border-line px-4 py-2 text-caption font-semibold text-ink-secondary transition-colors hover:border-line-strong hover:text-ink"
              >
                {copied ? 'Copied' : 'Copy text'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
