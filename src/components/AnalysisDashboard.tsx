import type { AnalysisResult } from '../ml/engine';
import { Users, UserCheck, Target, TrendingUp } from 'lucide-react';

interface AnalysisDashboardProps {
  result: AnalysisResult;
}

export function AnalysisDashboard({ result }: AnalysisDashboardProps) {
  const topCandidates = result.predictions.filter(p => p.score >= 70).length;
  const avgScore = Math.round(
    result.predictions.reduce((sum, p) => sum + p.score, 0) / Math.max(result.predictions.length, 1)
  );

  const stats = [
    {
      label: 'Members Analyzed',
      value: result.totalMembers.toLocaleString(),
      icon: Users,
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-violet-500/10',
      textColor: 'text-violet-400',
    },
    {
      label: 'Contacts Scored',
      value: result.totalContacts.toLocaleString(),
      icon: UserCheck,
      color: 'from-indigo-500 to-blue-600',
      bgColor: 'bg-indigo-500/10',
      textColor: 'text-indigo-400',
    },
    {
      label: 'High Potential (70+)',
      value: topCandidates.toLocaleString(),
      icon: Target,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-400',
    },
    {
      label: 'Average Score',
      value: `${avgScore}/100`,
      icon: TrendingUp,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Analysis Results</h2>
        <span className="text-sm text-slate-400">
          Model Accuracy: <span className="font-semibold text-emerald-400">{result.modelAccuracy}%</span>
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-sm text-slate-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Score Distribution */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Score Distribution</h3>
        <div className="flex items-end gap-1 h-32">
          {(() => {
            const buckets = Array(10).fill(0);
            result.predictions.forEach(p => {
              const bucket = Math.min(Math.floor((p.score - 1) / 10), 9);
              buckets[bucket]++;
            });
            const maxBucket = Math.max(...buckets, 1);
            return buckets.map((count, idx) => {
              const height = (count / maxBucket) * 100;
              const label = `${idx * 10 + 1}-${(idx + 1) * 10}`;
              const isHighlighted = idx >= 7;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-500">{count}</span>
                  <div
                    className={`w-full rounded-t transition-all ${
                      isHighlighted
                        ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                        : 'bg-gradient-to-t from-slate-700 to-slate-500'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">{label}</span>
                </div>
              );
            });
          })()}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
          <span>← Least Likely</span>
          <span>Most Likely →</span>
        </div>
      </div>
    </div>
  );
}
