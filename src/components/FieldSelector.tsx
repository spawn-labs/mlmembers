import { useState } from 'react';
import { Eye, EyeOff, Zap, RotateCcw, ShieldCheck, Info, MapPin } from 'lucide-react';
import { cn } from '../utils/cn';

interface FieldSelectorProps {
  sharedFields: string[];
  excludedFields: Set<string>;
  onToggleField: (field: string) => void;
  onExcludeAll: (fields: string[]) => void;
  onIncludeAll: () => void;
  onAutoDetect: () => void;
  addressField?: string | null;
  columbiaEnabled?: boolean;
}

// Heuristic patterns for fields that are likely contact-only / not analytically useful
const CONTACT_ONLY_PATTERNS = [
  /^(first[_\s]?name|last[_\s]?name|full[_\s]?name|name)$/i,
  /^(email|e[_\s]?mail|email[_\s]?address)$/i,
  /^(phone|phone[_\s]?number|mobile|cell|telephone)$/i,
  /^(address|street|city|state|zip|zip[_\s]?code|postal|country)$/i,
  /^(id|member[_\s]?id|contact[_\s]?id|record[_\s]?id|uuid)$/i,
];

export function isLikelyContactField(field: string): boolean {
  return CONTACT_ONLY_PATTERNS.some(pattern => pattern.test(field.trim()));
}

export function FieldSelector({
  sharedFields,
  excludedFields,
  onToggleField,
  onExcludeAll,
  onIncludeAll,
  onAutoDetect,
  addressField,
  columbiaEnabled,
}: FieldSelectorProps) {
  const [showHelp, setShowHelp] = useState(false);

  const includedCount = sharedFields.filter(f => !excludedFields.has(f)).length;
  const excludedCount = excludedFields.size;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Select Fields for Analysis</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Toggle off fields that are only for contact/identification purposes and should not
              factor into membership prediction.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className={cn(
            'flex-shrink-0 rounded-lg p-2 transition',
            showHelp
              ? 'bg-blue-500/20 text-blue-300'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
          )}
          title="Help"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Help Callout */}
      {showHelp && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-200 space-y-2">
          <p className="font-medium text-blue-300">💡 Why exclude fields?</p>
          <p>
            Fields like <strong>name</strong>, <strong>email</strong>, and <strong>phone</strong>{' '}
            are identifiers — they're unique to each person and don't indicate membership
            likelihood. Including them adds noise and reduces prediction accuracy.
          </p>
          <p>
            <strong>Address fields</strong> are not analyzed directly. Instead, when Columbia
            geo-analysis is enabled, addresses are used to determine residency status (in/out of
            Columbia, MD) and distance — those derived fields are then analyzed by the ML model.
          </p>
          <p>
            Focus on <strong>behavioral</strong> and <strong>demographic</strong> fields (e.g., age,
            visit frequency, parental status) for the best results.
          </p>
          <p>
            <strong>Binary fields</strong> like gender (Male/Female) and parental status
            (Parent/Non-Parent) are handled specially — one value must be &ldquo;more likely&rdquo;
            and the other &ldquo;less likely,&rdquo; though the confidence may be low.
          </p>
          <p>
            <strong>Date of last visit</strong> is automatically converted to &ldquo;days since last
            visit&rdquo; — so the ML model understands recency rather than raw dates.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onAutoDetect}
          className="flex items-center gap-1.5 rounded-lg bg-violet-500/15 border border-violet-500/30 px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/25 transition"
        >
          <Zap className="h-3.5 w-3.5" />
          Auto-Detect
        </button>
        <button
          onClick={onIncludeAll}
          className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition"
        >
          <Eye className="h-3.5 w-3.5" />
          Include All
        </button>
        <button
          onClick={() => onExcludeAll(sharedFields)}
          className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Exclude All
        </button>
        <button
          onClick={onAutoDetect}
          className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 transition"
          title="Reset to auto-detected defaults"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>

        {/* Counter */}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-emerald-400">
            <span className="font-bold">{includedCount}</span> included
          </span>
          {excludedCount > 0 && (
            <span className="text-slate-500">
              <span className="font-bold">{excludedCount}</span> excluded
            </span>
          )}
        </div>
      </div>

      {/* Field Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {sharedFields.map(field => {
          const isExcluded = excludedFields.has(field);
          const isContactField = isLikelyContactField(field);
          const isAddressField = addressField && field === addressField;
          const isGeoHandled = isAddressField && columbiaEnabled;

          return (
            <button
              key={field}
              onClick={() => {
                if (isGeoHandled) return; // Don't allow toggling the address field when Columbia is enabled
                onToggleField(field);
              }}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-200',
                isGeoHandled
                  ? 'border-blue-500/20 bg-blue-500/5 cursor-default'
                  : isExcluded
                  ? 'border-white/5 bg-white/[0.01] hover:border-white/15 hover:bg-white/[0.03]'
                  : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
              )}
            >
              {/* Toggle indicator */}
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0 transition-all duration-200',
                  isGeoHandled
                    ? 'bg-blue-500/20 border border-blue-500/40'
                    : isExcluded
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-emerald-500/30 border border-emerald-500/50'
                )}
              >
                {isGeoHandled ? (
                  <MapPin className="h-3 w-3 text-blue-400" />
                ) : !isExcluded ? (
                  <svg className="h-3 w-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </div>

              {/* Field name and hint */}
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-sm font-medium truncate transition-colors',
                    isGeoHandled ? 'text-blue-300'
                    : isExcluded ? 'text-slate-500 line-through decoration-slate-600' : 'text-white'
                  )}
                >
                  {field}
                </span>
                {isGeoHandled ? (
                  <span className="block text-[10px] text-blue-400/70 mt-0.5">
                    used for Columbia geo-analysis
                  </span>
                ) : isContactField ? (
                  <span className="block text-[10px] text-amber-400/70 mt-0.5">
                    likely identifier
                  </span>
                ) : null}
              </div>

              {/* Status icon */}
              <div className="flex-shrink-0">
                {isGeoHandled ? (
                  <MapPin className="h-3.5 w-3.5 text-blue-400/60" />
                ) : isExcluded ? (
                  <EyeOff className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 transition" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-emerald-400/60" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Warning if too few fields selected */}
      {includedCount === 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <span>At least one field must be included for analysis.</span>
        </div>
      )}
      {includedCount > 0 && includedCount <= 2 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span>Only {includedCount} field{includedCount === 1 ? '' : 's'} selected. More fields generally improve prediction accuracy.</span>
        </div>
      )}
    </div>
  );
}
