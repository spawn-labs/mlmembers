import { MapPin, Home, Navigation } from 'lucide-react';
import type { ColumbiaSummary } from '../utils/geo';
import { cn } from '../utils/cn';

interface ColumbiaInsightsProps {
  memberSummary: ColumbiaSummary;
  contactSummary: ColumbiaSummary;
}

export function ColumbiaInsights({ memberSummary, contactSummary }: ColumbiaInsightsProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <MapPin className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Columbia, MD Residency Analysis</h3>
          <p className="text-sm text-slate-400">
            Geographic proximity to Columbia used as a predictive factor
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Members */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-violet-300 uppercase tracking-wider flex items-center gap-2">
            <Home className="h-4 w-4" />
            Members
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">{memberSummary.residents}</p>
              <p className="text-xs text-slate-400 mt-0.5">Residents</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{memberSummary.nonResidents}</p>
              <p className="text-xs text-slate-400 mt-0.5">Non-Res</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-slate-400">{memberSummary.unknown}</p>
              <p className="text-xs text-slate-400 mt-0.5">Unknown</p>
            </div>
          </div>
          {memberSummary.avgDistance !== null && (
            <p className="text-xs text-slate-400">
              Non-resident avg distance: <span className="text-slate-300 font-medium">{memberSummary.avgDistance} mi</span>
              {memberSummary.minDistance !== null && memberSummary.maxDistance !== null && (
                <span> (range: {memberSummary.minDistance}–{memberSummary.maxDistance} mi)</span>
              )}
            </p>
          )}
          {memberSummary.total > 0 && (
            <div className="relative h-3 rounded-full bg-white/5 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${(memberSummary.residents / memberSummary.total) * 100}%` }}
                title={`${memberSummary.residents} residents`}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${(memberSummary.nonResidents / memberSummary.total) * 100}%` }}
                title={`${memberSummary.nonResidents} non-residents`}
              />
              <div
                className="bg-slate-600 h-full"
                style={{ width: `${(memberSummary.unknown / memberSummary.total) * 100}%` }}
                title={`${memberSummary.unknown} unknown`}
              />
            </div>
          )}
        </div>

        {/* Contacts */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Contacts
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">{contactSummary.residents}</p>
              <p className="text-xs text-slate-400 mt-0.5">Residents</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-amber-400">{contactSummary.nonResidents}</p>
              <p className="text-xs text-slate-400 mt-0.5">Non-Res</p>
            </div>
            <div className="rounded-lg bg-white/5 p-3 text-center">
              <p className="text-xl font-bold text-slate-400">{contactSummary.unknown}</p>
              <p className="text-xs text-slate-400 mt-0.5">Unknown</p>
            </div>
          </div>
          {contactSummary.avgDistance !== null && (
            <p className="text-xs text-slate-400">
              Non-resident avg distance: <span className="text-slate-300 font-medium">{contactSummary.avgDistance} mi</span>
              {contactSummary.minDistance !== null && contactSummary.maxDistance !== null && (
                <span> (range: {contactSummary.minDistance}–{contactSummary.maxDistance} mi)</span>
              )}
            </p>
          )}
          {contactSummary.total > 0 && (
            <div className="relative h-3 rounded-full bg-white/5 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${(contactSummary.residents / contactSummary.total) * 100}%` }}
              />
              <div
                className="bg-amber-500 h-full"
                style={{ width: `${(contactSummary.nonResidents / contactSummary.total) * 100}%` }}
              />
              <div
                className="bg-slate-600 h-full"
                style={{ width: `${(contactSummary.unknown / contactSummary.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Distance Distribution for contacts */}
      {contactSummary.distanceBuckets.some(b => b.count > 0) && (
        <div className="mt-6 pt-5 border-t border-white/5">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Contact Distance from Columbia (Non-Residents)
          </h4>
          <div className="flex items-end gap-2 h-20">
            {contactSummary.distanceBuckets.map((bucket, idx) => {
              const maxCount = Math.max(...contactSummary.distanceBuckets.map(b => b.count), 1);
              const height = (bucket.count / maxCount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  {bucket.count > 0 && (
                    <span className="text-xs text-slate-500">{bucket.count}</span>
                  )}
                  <div
                    className={cn(
                      'w-full rounded-t',
                      idx === 0 ? 'bg-emerald-500' :
                      idx === 1 ? 'bg-green-500' :
                      idx === 2 ? 'bg-amber-500' :
                      idx === 3 ? 'bg-orange-500' : 'bg-red-500'
                    )}
                    style={{ height: `${Math.max(height, bucket.count > 0 ? 4 : 0)}%` }}
                  />
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">{bucket.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend / Explanation */}
      <div className="mt-5 pt-4 border-t border-white/5">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="text-slate-400 font-medium">How it works:</span> Addresses are classified as 
          <span className="text-emerald-400"> Resident</span> (in Columbia, MD — ZIP codes 21044, 21045, 21046) or 
          <span className="text-amber-400"> Non-Resident</span> (outside Columbia). Non-resident distances are 
          calculated from the nearest Columbia boundary point. Both <code className="bg-white/5 px-1 rounded text-slate-300">columbia_resident</code> and 
          {' '}<code className="bg-white/5 px-1 rounded text-slate-300">distance_from_columbia_mi</code> are fed into 
          the ML model as predictive features.
        </p>
      </div>
    </div>
  );
}
