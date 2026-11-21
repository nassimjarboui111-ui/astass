import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, ShieldAlert, XCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckStatus, Severity } from '../types/astasecure';

export const CheckStatusLabel: React.FC<{ status: CheckStatus; severity?: Severity }> = ({
  status,
  severity = 'none',
}) => {
  const { t } = useLanguage();

  if (status === 'confirmed' && severity === 'none') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        {t.statuses.confirmed}
      </span>
    );
  }

  if (status === 'confirmed') {
    const color =
      severity === 'critical' || severity === 'high'
        ? 'text-rose-400'
        : severity === 'medium'
          ? 'text-amber-400'
          : 'text-slate-300';
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${color}`}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        {t.statuses.confirmed}
      </span>
    );
  }

  if (status === 'missing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        {t.statuses.missing}
      </span>
    );
  }

  if (status === 'technical_error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        {t.statuses.technical_error}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-300 whitespace-nowrap">
      <HelpCircle className="w-3.5 h-3.5 shrink-0" />
      {t.statuses.not_verified}
    </span>
  );
};

export const SeverityText: React.FC<{ severity: Severity }> = ({ severity }) => {
  const { t } = useLanguage();
  const styles: Record<Severity, string> = {
    critical: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    high: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    low: 'text-slate-300 border-slate-600/40 bg-slate-700/20',
    none: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded whitespace-nowrap ${styles[severity]}`}>
      {severity !== 'none' && <ShieldAlert className="w-3 h-3 shrink-0" />}
      {t.severities[severity]}
    </span>
  );
};
