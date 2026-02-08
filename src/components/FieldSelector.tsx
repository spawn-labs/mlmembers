import { useState } from 'react';
import { Eye, EyeOff, Zap, RotateCcw, ShieldCheck, Info } from 'lucide-react';
import { cn } from '../utils/cn';

interface FieldSelectorProps {
  sharedFields: string[];
  excludedFields: Set<string>;
  onToggleField: (field: string) => void;
  onExcludeAll: (fields: string[]) => void;
  onIncludeAll: () => void;
  onAutoDetect: () => void;
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
            Fields like <strong>name</strong>, <strong>email</strong>, <strong>phone</strong>, and{' '}
            <strong>address</strong> are identifiers — they're unique to each person and don't
            indicate membership likelihood. Including them adds noise and reduces prediction
            accuracy.
          </p>
          <p>
            Focus on <strong>behavioral</strong> and <strong>demographic</strong> fields (e.g., age,
            visit frequency, parental status) for the best results.
          </p>
          <p>
            Use the <strong>"Auto-Detect"</strong> button to let the app suggest which fields to
            exclude based on common patterns.
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

          return (
            <button
              key={field}
              onClick={() => onToggleField(field)}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-200',
                isExcluded
                  ? 'border-white/5 bg-white/[0.01] hover:border-white/15 hover:bg-white/[0.03]'
                  : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
              )}
            >
              {/* Toggle indicator */}
              <div
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md flex-shrink-0 transition-all duration-200',
                  isExcluded
                    ? 'bg-white/5 border border-white/10'
                    : 'bg-emerald-500/30 border border-emerald-500/50'
                )}
              >
                {!isExcluded && (
                  <svg className="h-3 w-3 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Field name and hint */}
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-sm font-medium truncate transition-colors',
                    isExcluded ? 'text-slate-500 line-through decoration-slate-600' : 'text-white'
                  )}
                >
                  {field}
                </span>
                {isContactField && (
                  <span className="block text-[10px] text-amber-400/70 mt-0.5">
                    likely identifier
                  </span>
                )}
              </div>

              {/* Status icon */}
              <div className="flex-shrink-0">
                {isExcluded ? (
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
