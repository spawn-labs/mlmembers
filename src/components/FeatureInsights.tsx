import type { FeatureImportance } from '../ml/engine';
import { BarChart3, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';

interface FeatureInsightsProps {
  features: FeatureImportance[];
}

export function FeatureInsights({ features }: FeatureInsightsProps) {
  const [showAll, setShowAll] = useState(false);
  const displayFeatures = showAll ? features : features.slice(0, 10);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
            <BarChart3 className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Feature Importance & Insights</h3>
            <p className="text-sm text-slate-400">
              Which data points are most correlated with membership
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-1.5">
          <Info className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs text-blue-300">{features.length} factors analyzed</span>
        </div>
      </div>

      <div className="space-y-3">
        {displayFeatures.map((feature, idx) => (
          <div
            key={feature.field}
            className="group rounded-lg border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-start gap-4">
              {/* Rank */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-sm font-bold text-slate-400 flex-shrink-0">
                {idx + 1}
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="font-semibold text-white truncate">
                      {feature.field.includes('(') ? (
                        <>
                          {feature.field.split('(')[0].trim().replace(/_/g, ' ')}{' '}
                          <span className={feature.direction === 'positive' ? 'text-emerald-400' : 'text-red-400'}>
                            ({feature.field.split('(')[1]}
                          </span>
                        </>
                      ) : feature.field.includes('::') ? (
                        <>
                          {feature.field.split('::')[0].replace(/_/g, ' ')}:{' '}
                          <span className="text-violet-300">{feature.field.split('::')[1]}</span>
                        </>
                      ) : (
                        feature.field.replace(/_/g, ' ')
                      )}
                    </h4>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      feature.direction === 'positive'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    )}>
                      {feature.direction === 'positive' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {feature.direction}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-2xl font-bold text-white">{feature.importance}</span>
                    <span className="text-sm text-slate-500">/100</span>
                  </div>
                </div>

                {/* Importance Bar */}
                <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-all duration-1000',
                      feature.importance >= 70
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                        : feature.importance >= 40
                        ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                        : 'bg-gradient-to-r from-slate-600 to-slate-400'
                    )}
                    style={{ width: `${feature.importance}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-slate-500">Correlation: </span>
                    <span className={cn(
                      'font-semibold',
                      Math.abs(feature.correlation) >= 0.5 ? 'text-emerald-400' :
                      Math.abs(feature.correlation) >= 0.3 ? 'text-amber-400' : 'text-slate-300'
                    )}>
                      {feature.correlation > 0 ? '+' : ''}{feature.correlation}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Confidence: </span>
                    <span className={cn(
                      'font-semibold',
                      feature.confidence >= 70 ? 'text-emerald-400' :
                      feature.confidence >= 40 ? 'text-amber-400' : 'text-slate-300'
                    )}>
                      {feature.confidence}%
                    </span>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.explanation}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {features.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 transition"
        >
          {showAll ? 'Show Top 10' : `Show All ${features.length} Factors`}
        </button>
      )}
    </div>
  );
}
