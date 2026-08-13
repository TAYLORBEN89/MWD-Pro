import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface InstrumentCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Skip outer padding/border when nested */
  bare?: boolean;
}

export function InstrumentCard({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className = '',
  bare = false,
}: InstrumentCardProps) {
  const showHeader = Boolean(title || Icon || actions);

  return (
    <div className={`${bare ? '' : 'instrument'} ${className}`.trim()}>
      {showHeader && (
        <div className="instrument-header">
          <div className="instrument-title-row">
            {Icon && (
              <div className="instrument-icon">
                <Icon size={18} strokeWidth={2} />
              </div>
            )}
            {(title || subtitle) && (
              <div className="min-w-0">
                {title && <h3 className="instrument-title">{title}</h3>}
                {subtitle && <p className="instrument-subtitle">{subtitle}</p>}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function InstrumentMetric({
  label,
  value,
  unit,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
}) {
  return (
    <div className="instrument-metric">
      <p className="instrument-metric-label">{label}</p>
      <p className="instrument-metric-value">
        {value}
        {unit ? <span className="text-sm text-zinc-500 font-medium ml-1">{unit}</span> : null}
      </p>
    </div>
  );
}

export function InstrumentTip({ children }: { children: React.ReactNode }) {
  return <div className="instrument-tip">{children}</div>;
}
