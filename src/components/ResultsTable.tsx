import { useState, useMemo } from 'react';
import type { PredictionResult } from '../ml/engine';
import { Download, Search, ChevronLeft, ChevronRight, ArrowUpDown, MapPin } from 'lucide-react';
import { cn } from '../utils/cn';

interface ResultsTableProps {
  predictions: PredictionResult[];
  headers: string[];
  onDownload: () => void;
  columbiaEnabled?: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  let colorClass: string;
  let label: string;
  if (score >= 80) {
    colorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    label = 'Very High';
  } else if (score >= 60) {
    colorClass = 'bg-green-500/20 text-green-300 border-green-500/30';
    label = 'High';
  } else if (score >= 40) {
    colorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    label = 'Medium';
  } else if (score >= 20) {
    colorClass = 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    label = 'Low';
  } else {
    colorClass = 'bg-red-500/20 text-red-300 border-red-500/30';
    label = 'Very Low';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              score >= 70 ? 'bg-emerald-500' :
              score >= 40 ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold', colorClass)}>
          {score}
        </span>
      </div>
      <span className="text-xs text-slate-500 hidden lg:inline">{label}</span>
    </div>
  );
}

function ResidencyBadge({ data }: { data: Record<string, string> }) {
  const isResident = data.columbia_resident === 'yes';
  const distance = data.distance_from_columbia_mi;

  return (
    <div className="flex items-center gap-1.5">
      <MapPin className={cn('h-3 w-3', isResident ? 'text-emerald-400' : 'text-amber-400')} />
      <span className={cn(
        'text-xs font-medium',
        isResident ? 'text-emerald-400' : 'text-amber-400'
      )}>
        {isResident ? 'Resident' : 'Non-Res'}
      </span>
      {!isResident && distance && (
        <span className="text-[10px] text-slate-500">
          {distance} mi
        </span>
      )}
    </div>
  );
}

export function ResultsTable({ predictions, headers, onDownload, columbiaEnabled }: ResultsTableProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [residencyFilter, setResidencyFilter] = useState<'all' | 'resident' | 'non-resident'>('all');
  const pageSize = 20;

  // Select display columns - show first 5 columns + score
  const displayHeaders = useMemo(() => headers.slice(0, 6), [headers]);

  const filteredPredictions = useMemo(() => {
    let result = [...predictions];

    // Apply score filter
    if (filter === 'high') result = result.filter(p => p.score >= 70);
    else if (filter === 'medium') result = result.filter(p => p.score >= 40 && p.score < 70);
    else if (filter === 'low') result = result.filter(p => p.score < 40);

    // Apply residency filter
    if (columbiaEnabled && residencyFilter !== 'all') {
      result = result.filter(p => {
        const isRes = p.originalData.columbia_resident === 'yes';
        return residencyFilter === 'resident' ? isRes : !isRes;
      });
    }

    // Apply search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(p =>
        Object.values(p.originalData).some(v => v.toLowerCase().includes(lower))
      );
    }

    // Apply sort
    result.sort((a, b) => sortAsc ? a.score - b.score : b.score - a.score);

    return result;
  }, [predictions, search, sortAsc, filter, columbiaEnabled, residencyFilter]);

  const totalPages = Math.ceil(filteredPredictions.length / pageSize);
  const pagedPredictions = filteredPredictions.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Contact Scores</h3>
            <p className="text-sm text-slate-400">
              {filteredPredictions.length} contacts • Sorted by membership likelihood
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 w-48"
              />
            </div>
            <button
              onClick={onDownload}
              className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30 transition border border-emerald-500/30"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {(['all', 'high', 'medium', 'low'] as const).map(f => {
            const counts = {
              all: predictions.length,
              high: predictions.filter(p => p.score >= 70).length,
              medium: predictions.filter(p => p.score >= 40 && p.score < 70).length,
              low: predictions.filter(p => p.score < 40).length,
            };
            return (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(0); }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  filter === f
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10'
                )}
              >
                {f === 'all' ? 'All' : f === 'high' ? '🟢 High (70+)' : f === 'medium' ? '🟡 Medium' : '🔴 Low'}{' '}
                <span className="text-slate-500">({counts[f]})</span>
              </button>
            );
          })}

          {/* Columbia residency filter */}
          {columbiaEnabled && (
            <>
              <div className="w-px h-5 bg-white/10 mx-1" />
              {(['all', 'resident', 'non-resident'] as const).map(f => {
                const counts = {
                  all: predictions.length,
                  resident: predictions.filter(p => p.originalData.columbia_resident === 'yes').length,
                  'non-resident': predictions.filter(p => p.originalData.columbia_resident !== 'yes').length,
                };
                const labels = {
                  all: '📍 All Locations',
                  resident: '🏠 Residents',
                  'non-resident': '🗺️ Non-Residents',
                };
                return (
                  <button
                    key={f}
                    onClick={() => { setResidencyFilter(f); setPage(0); }}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                      residencyFilter === f
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10'
                    )}
                  >
                    {labels[f]}{' '}
                    <span className="text-slate-500">({counts[f]})</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-white transition"
                >
                  Score
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              {displayHeaders.map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {h}
                </th>
              ))}
              {columbiaEnabled && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Columbia
                  </span>
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                Top Factor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pagedPredictions.map((prediction, idx) => (
              <tr
                key={idx}
                className="hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-4 py-3">
                  <ScoreBadge score={prediction.score} />
                </td>
                {displayHeaders.map(h => (
                  <td key={h} className="px-4 py-3 text-slate-300 max-w-[200px] truncate">
                    {prediction.originalData[h] || '—'}
                  </td>
                ))}
                {columbiaEnabled && (
                  <td className="px-4 py-3">
                    <ResidencyBadge data={prediction.originalData} />
                  </td>
                )}
                <td className="px-4 py-3">
                  {prediction.factors[0] && (
                    <span className="text-xs text-slate-400">
                      <span className="font-medium text-slate-300">{prediction.factors[0].field}</span>
                      {' '}
                      <span className={prediction.factors[0].contribution > 0 ? 'text-emerald-400' : 'text-red-400'}>
                        ({prediction.factors[0].contribution > 0 ? '+' : ''}{prediction.factors[0].contribution})
                      </span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
          <p className="text-sm text-slate-400">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredPredictions.length)} of {filteredPredictions.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
