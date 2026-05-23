import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Info } from 'lucide-react';

import type { ValidationResult } from '@/features/readmission/lib/annotationValidation';

type Props = {
  validation: ValidationResult;
  submitted: boolean;
};

type Severity = 'ok' | 'error' | 'warning';

function deriveSeverity(validation: ValidationResult, submitted: boolean): Severity {
  if (submitted) return 'ok';
  if (validation.errors.length > 0) return 'error';
  if (!validation.ok) return 'error';
  if (validation.warnings.length > 0) return 'warning';
  return 'ok';
}

function humanize(message: string): string {
  const factorMatch = message.match(/^Factor "(.+?)":\s*(.+)$/);
  if (factorMatch) {
    const [, name, rest] = factorMatch;
    const detail = humanizeFactorDetail(rest);
    return `Factor "${name}" — ${detail}`;
  }
  if (message === 'At least one finalized readmission factor is required before submission.') {
    return 'No saved readmission factor yet.';
  }
  if (message === 'At least one primary readmission factor is required.') {
    return 'No factor marked as Primary.';
  }
  if (message === 'Annotation note version hash does not match the current case notes.') {
    return 'Notes have changed since you opened this case — reload.';
  }
  if (message.startsWith('Evidence span ')) {
    return message
      .replace(/^Evidence span /, 'Highlight ')
      .replace(/selectedText does not match .*/, 'no longer matches the note text — re-highlight it.')
      .replace(/linked evidence group not found\./, 'no factor is linked.')
      .replace(/linked factor not found\./, 'links to a deleted factor.');
  }
  return message;
}

function humanizeFactorDetail(detail: string): string {
  if (detail === 'at least one evidence span is required.') {
    return 'no text highlighted in the notes.';
  }
  if (detail === 'label is required.') {
    return 'label is missing.';
  }
  if (detail === 'rename from default "Factor N" label.') {
    return 'rename from the default placeholder.';
  }
  if (detail === 'role must be Primary or Contributing.') {
    return 'pick a role (Primary or Contributing).';
  }
  if (detail === 'confidence must be between 1 and 5.') {
    return 'set a confidence level.';
  }
  const longNote = detail.match(/^clinician note exceeds (\d+) words \((\d+)\)\.$/);
  if (longNote) {
    const [, max, actual] = longNote;
    return `note is too long (${actual} / ${max} words).`;
  }
  return detail;
}

function tone(severity: Severity) {
  if (severity === 'ok') {
    return {
      border: 'hsla(145, 40%, 45%, 0.45)',
      text: 'hsl(145, 45%, 28%)',
      bg: 'hsla(145, 50%, 62%, 0.12)',
      Icon: CheckCircle2,
    };
  }
  if (severity === 'warning') {
    return {
      border: 'hsla(35, 90%, 45%, 0.45)',
      text: 'hsl(35, 80%, 30%)',
      bg: 'hsla(35, 90%, 60%, 0.12)',
      Icon: Info,
    };
  }
  return {
    border: 'hsla(0, 70%, 50%, 0.45)',
    text: 'var(--color-accent-danger)',
    bg: 'hsla(0, 70%, 50%, 0.08)',
    Icon: AlertTriangle,
  };
}

export function SubmitReadinessPanel({ validation, submitted }: Props) {
  const severity = deriveSeverity(validation, submitted);
  const rawItems = severity === 'error' ? validation.errors : validation.warnings;
  const items = rawItems.map(humanize);
  const [open, setOpen] = useState(false);
  const { border, text, bg, Icon } = tone(severity);

  const groupLabel = severity === 'warning' ? 'warnings' : 'issues blocking submit';
  const summary = submitted
    ? 'Submitted'
    : severity === 'ok'
      ? 'Ready to submit'
      : items.length === 1
        ? items[0]
        : `${items.length} ${groupLabel} — ${items[0]}`;

  const hasItems = items.length > 0;

  return (
    <section
      className="shrink-0 rounded-lg border"
      style={{ borderColor: border, background: bg, color: text }}
      role={severity === 'error' ? 'alert' : 'status'}
    >
      <button
        type="button"
        onClick={() => hasItems && setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-semibold"
        style={{ cursor: hasItems ? 'pointer' : 'default' }}
        aria-expanded={hasItems ? open : undefined}
        disabled={!hasItems}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate">{summary}</span>
        {hasItems ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
          )
        ) : null}
      </button>
      {open && hasItems ? (
        <ul
          className="list-inside list-disc border-t px-3 py-1.5 text-[11px]"
          style={{ borderColor: border }}
        >
          {items.slice(0, 8).map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
          {items.length > 8 ? (
            <li className="opacity-70">…and {items.length - 8} more</li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
