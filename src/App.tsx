import { useState, useCallback, useMemo, useEffect } from 'react';
import { parseCSV, downloadCSV } from './utils/csv';
import type { CSVData } from './utils/csv';
import { analyzeAndPredict } from './ml/engine';
import type { AnalysisResult } from './ml/engine';
import { enrichWithColumbiaData, detectAddressField, getColumbiaSummary } from './utils/geo';
import type { ColumbiaSummary } from './utils/geo';
import { FileUploadCard } from './components/FileUploadCard';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { ResultsTable } from './components/ResultsTable';
import { FeatureInsights } from './components/FeatureInsights';
import { FieldSelector, isLikelyContactField } from './components/FieldSelector';
import { ColumbiaInsights } from './components/ColumbiaInsights';
import {
  Brain,
  Download,
  ArrowRight,
  Sparkles,
  AlertCircle,
  MapPin,
} from 'lucide-react';

type AppStep = 'upload' | 'analyzing' | 'results';

export function App() {
  const [memberData, setMemberData] = useState<CSVData | null>(null);
  const [contactData, setContactData] = useState<CSVData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState<AppStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [excludedFields, setExcludedFields] = useState<Set<string>>(new Set());
  const [columbiaEnabled, setColumbiaEnabled] = useState(true);
  const [memberColumbiaSummary, setMemberColumbiaSummary] = useState<ColumbiaSummary | null>(null);
  const [contactColumbiaSummary, setContactColumbiaSummary] = useState<ColumbiaSummary | null>(null);
  const [enrichedContactData, setEnrichedContactData] = useState<Record<string, string>[] | null>(null);

  // Detect address field from either dataset
  const addressField = useMemo(() => {
    if (memberData) {
      return detectAddressField(memberData.headers);
    }
    if (contactData) {
      return detectAddressField(contactData.headers);
    }
    return null;
  }, [memberData, contactData]);

  // Compute shared fields between both CSVs
  const sharedFields = useMemo(() => {
    if (!memberData || !contactData) return [];
    return memberData.headers.filter(h => contactData.headers.includes(h));
  }, [memberData, contactData]);

  // Compute which fields will actually be used for analysis (including synthetic Columbia fields)
  const analysisFields = useMemo(() => {
    const base = sharedFields.filter(f => !excludedFields.has(f));
    // Add synthetic Columbia fields if enabled and address field exists
    if (columbiaEnabled && addressField) {
      const syntheticFields = ['columbia_resident', 'distance_from_columbia_mi'];
      return [...base, ...syntheticFields.filter(f => !base.includes(f))];
    }
    return base;
  }, [sharedFields, excludedFields, columbiaEnabled, addressField]);

  // Auto-detect contact-only fields and exclude them
  const autoDetectExclusions = useCallback(() => {
    const autoExcluded = new Set<string>();
    sharedFields.forEach(field => {
      if (isLikelyContactField(field)) {
        autoExcluded.add(field);
      }
    });
    setExcludedFields(autoExcluded);
  }, [sharedFields]);

  const handleMemberUpload = useCallback(async (file: File) => {
    try {
      setError(null);
      const data = await parseCSV(file);
      setMemberData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse member CSV');
    }
  }, []);

  const handleContactUpload = useCallback(async (file: File) => {
    try {
      setError(null);
      const data = await parseCSV(file);
      setContactData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse contact CSV');
    }
  }, []);

  // Auto-detect exclusions and compute Columbia summaries when both files are loaded
  useEffect(() => {
    if (memberData && contactData) {
      const fields = memberData.headers.filter(h => contactData.headers.includes(h));
      const autoExcluded = new Set<string>();
      fields.forEach(field => {
        if (isLikelyContactField(field)) {
          autoExcluded.add(field);
        }
      });
      setExcludedFields(autoExcluded);

      // Compute Columbia summaries if address field exists
      const addrField = detectAddressField(memberData.headers);
      if (addrField) {
        setMemberColumbiaSummary(getColumbiaSummary(memberData.rows, addrField));
        setContactColumbiaSummary(getColumbiaSummary(contactData.rows, addrField));
      }
    }
  }, [memberData, contactData]);

  const handleToggleField = useCallback((field: string) => {
    setExcludedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }, []);

  const handleExcludeAll = useCallback((fields: string[]) => {
    setExcludedFields(new Set(fields));
  }, []);

  const handleIncludeAll = useCallback(() => {
    setExcludedFields(new Set());
  }, []);

  const runAnalysis = useCallback(() => {
    if (!memberData || !contactData) return;
    if (analysisFields.length === 0) {
      setError('At least one field must be included for analysis. Please toggle on some fields.');
      return;
    }

    setStep('analyzing');
    setError(null);

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        let enrichedMembers = memberData.rows;
        let enrichedContacts = contactData.rows;

        // Enrich with Columbia residency data if enabled
        if (columbiaEnabled && addressField) {
          enrichedMembers = enrichWithColumbiaData(memberData.rows, addressField);
          enrichedContacts = enrichWithColumbiaData(contactData.rows, addressField);
          setEnrichedContactData(enrichedContacts);
        } else {
          setEnrichedContactData(null);
        }

        // Pass only the included fields (not excluded) to the ML engine
        const result = analyzeAndPredict(
          enrichedMembers,
          enrichedContacts,
          analysisFields,
          analysisFields
        );
        setAnalysisResult(result);
        setStep('results');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Analysis failed');
        setStep('upload');
      }
    }, 100);
  }, [memberData, contactData, analysisFields, columbiaEnabled, addressField]);

  const handleDownload = useCallback(() => {
    if (!analysisResult || !contactData) return;

    const scoreMap = new Map(
      analysisResult.predictions.map(p => {
        // Match using original data fields (without synthetic ones)
        const key = contactData.headers.map(h => p.originalData[h] || '').join('|||');
        return [key, p];
      })
    );

    // Build output rows with synthetic columns included
    const extraHeaders: string[] = [];
    if (columbiaEnabled && addressField && enrichedContactData) {
      extraHeaders.push('Columbia_Resident', 'Distance_From_Columbia_MI');
    }

    const allHeaders = [...contactData.headers, ...extraHeaders, 'Membership_Score'];

    const csvRows = contactData.rows.map((row, idx) => {
      const key = contactData.headers.map(h => row[h] || '').join('|||');
      const prediction = scoreMap.get(key);
      const score = prediction ? prediction.score : 0;

      const values: Record<string, string> = { ...row };

      if (columbiaEnabled && addressField && enrichedContactData && enrichedContactData[idx]) {
        values['Columbia_Resident'] = enrichedContactData[idx].columbia_resident === 'yes' ? 'Resident' : 'Non-Resident';
        values['Distance_From_Columbia_MI'] = enrichedContactData[idx].distance_from_columbia_mi || '';
      }

      values['Membership_Score'] = String(score);
      return values;
    });

    const csv = generateCSVEnhanced(csvRows, allHeaders);
    const fileName = contactData.fileName.replace('.csv', '') + '_scored.csv';
    downloadCSV(csv, fileName);
  }, [analysisResult, contactData, columbiaEnabled, addressField, enrichedContactData]);

  const resetApp = useCallback(() => {
    setMemberData(null);
    setContactData(null);
    setAnalysisResult(null);
    setStep('upload');
    setError(null);
    setExcludedFields(new Set());
    setColumbiaEnabled(true);
    setMemberColumbiaSummary(null);
    setContactColumbiaSummary(null);
    setEnrichedContactData(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-500/30">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">MemberPredict</h1>
                <p className="text-xs text-slate-400">ML-Powered Membership Scoring</p>
              </div>
            </div>
            {step === 'results' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/30 border border-emerald-500/30"
                >
                  <Download className="h-4 w-4" />
                  Download Scored CSV
                </button>
                <button
                  onClick={resetApp}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/20 border border-white/10"
                >
                  New Analysis
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-8">
            {/* Hero */}
            <div className="text-center space-y-4 py-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/30 px-4 py-1.5 text-sm text-violet-300">
                <Sparkles className="h-4 w-4" />
                Machine Learning Powered
              </div>
              <h2 className="text-4xl font-bold text-white tracking-tight">
                Predict Your Next Members
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Upload your member list and a contact list. Our ML engine analyzes patterns in your member data
                to score contacts on their likelihood of becoming members.
              </p>
            </div>

            {/* Upload Cards */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <FileUploadCard
                title="Member List"
                description="Upload a CSV of your current organization members with their data fields."
                onUpload={handleMemberUpload}
                uploadedData={memberData}
                accentColor="violet"
                step={1}
              />
              <FileUploadCard
                title="Contact List"
                description="Upload a CSV of prospective contacts to score against member patterns."
                onUpload={handleContactUpload}
                uploadedData={contactData}
                accentColor="indigo"
                step={2}
              />
            </div>

            {/* Field Selector */}
            {memberData && contactData && sharedFields.length > 0 && (
              <div className="max-w-4xl mx-auto">
                <FieldSelector
                  sharedFields={sharedFields}
                  excludedFields={excludedFields}
                  onToggleField={handleToggleField}
                  onExcludeAll={handleExcludeAll}
                  onIncludeAll={handleIncludeAll}
                  onAutoDetect={autoDetectExclusions}
                />
              </div>
            )}

            {/* Columbia, MD Residency Toggle */}
            {memberData && contactData && addressField && (
              <div className="max-w-4xl mx-auto">
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0">
                        <MapPin className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">Columbia, MD Residency Analysis</h3>
                        <p className="text-sm text-slate-400 mt-0.5">
                          Automatically classifies addresses as <span className="text-emerald-400">Resident</span> (in Columbia) or{' '}
                          <span className="text-amber-400">Non-Resident</span> (outside Columbia) and calculates distance from Columbia&apos;s border.
                        </p>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                      onClick={() => setColumbiaEnabled(!columbiaEnabled)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        columbiaEnabled ? 'bg-blue-500' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          columbiaEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {columbiaEnabled && (
                    <>
                      <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 px-4 py-3 text-sm text-blue-200">
                        <p>
                          <span className="font-medium text-blue-300">Address field detected:</span>{' '}
                          <code className="bg-white/5 px-1.5 py-0.5 rounded text-blue-200">{addressField}</code>
                        </p>
                        <p className="mt-1.5 text-blue-300/80 text-xs">
                          Two synthetic analysis fields will be created: <code className="bg-white/5 px-1 rounded">columbia_resident</code> (yes/no) and{' '}
                          <code className="bg-white/5 px-1 rounded">distance_from_columbia_mi</code> (miles from border for non-residents).
                          These will be fed into the ML model alongside your selected fields.
                        </p>
                      </div>

                      {/* Preview summaries */}
                      {memberColumbiaSummary && contactColumbiaSummary && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4 space-y-2">
                            <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Members Preview</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-emerald-400">
                                <span className="font-bold">{memberColumbiaSummary.residents}</span> Residents
                              </span>
                              <span className="text-amber-400">
                                <span className="font-bold">{memberColumbiaSummary.nonResidents}</span> Non-Res
                              </span>
                              {memberColumbiaSummary.unknown > 0 && (
                                <span className="text-slate-500">
                                  <span className="font-bold">{memberColumbiaSummary.unknown}</span> Unknown
                                </span>
                              )}
                            </div>
                            <div className="relative h-2 rounded-full bg-white/5 overflow-hidden flex">
                              <div
                                className="bg-emerald-500 h-full"
                                style={{ width: `${(memberColumbiaSummary.residents / memberColumbiaSummary.total) * 100}%` }}
                              />
                              <div
                                className="bg-amber-500 h-full"
                                style={{ width: `${(memberColumbiaSummary.nonResidents / memberColumbiaSummary.total) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="rounded-lg bg-white/[0.03] border border-white/5 p-4 space-y-2">
                            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Contacts Preview</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-emerald-400">
                                <span className="font-bold">{contactColumbiaSummary.residents}</span> Residents
                              </span>
                              <span className="text-amber-400">
                                <span className="font-bold">{contactColumbiaSummary.nonResidents}</span> Non-Res
                              </span>
                              {contactColumbiaSummary.unknown > 0 && (
                                <span className="text-slate-500">
                                  <span className="font-bold">{contactColumbiaSummary.unknown}</span> Unknown
                                </span>
                              )}
                            </div>
                            <div className="relative h-2 rounded-full bg-white/5 overflow-hidden flex">
                              <div
                                className="bg-emerald-500 h-full"
                                style={{ width: `${(contactColumbiaSummary.residents / contactColumbiaSummary.total) * 100}%` }}
                              />
                              <div
                                className="bg-amber-500 h-full"
                                style={{ width: `${(contactColumbiaSummary.nonResidents / contactColumbiaSummary.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* No shared columns warning */}
            {memberData && contactData && sharedFields.length === 0 && (
              <div className="max-w-4xl mx-auto">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
                  <p className="text-sm text-amber-300">
                    ⚠️ No common columns found between the two files. Please ensure both CSVs share column headers.
                  </p>
                </div>
              </div>
            )}

            {/* Analysis summary before running */}
            {memberData && contactData && analysisFields.length > 0 && (
              <div className="max-w-4xl mx-auto">
                <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 flex items-center justify-between">
                  <p className="text-sm text-slate-400">
                    <span className="text-emerald-400 font-semibold">{analysisFields.length}</span> field{analysisFields.length !== 1 ? 's' : ''} will be analyzed:{' '}
                    <span className="text-slate-300">
                      {analysisFields.slice(0, 5).join(', ')}
                      {analysisFields.length > 5 ? `, +${analysisFields.length - 5} more` : ''}
                    </span>
                    {columbiaEnabled && addressField && (
                      <span className="ml-2 text-blue-400">
                        (incl. Columbia residency & distance)
                      </span>
                    )}
                  </p>
                  {excludedFields.size > 0 && (
                    <p className="text-xs text-slate-500">
                      {excludedFields.size} field{excludedFields.size !== 1 ? 's' : ''} excluded
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Analyze Button */}
            <div className="flex justify-center">
              <button
                onClick={runAnalysis}
                disabled={!memberData || !contactData || analysisFields.length === 0}
                className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-indigo-500/25 transition-all hover:shadow-2xl hover:shadow-indigo-500/40 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-xl"
              >
                <Brain className="h-6 w-6" />
                Run ML Analysis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* How It Works */}
            <div className="max-w-4xl mx-auto pt-8">
              <h3 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">How It Works</h3>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { step: '1', title: 'Upload Data', desc: 'Provide your member list and a contact list as CSV files with shared data columns.' },
                  { step: '2', title: 'Select Fields', desc: 'Choose which data points to analyze. Exclude contact-only fields like name, email, and phone.' },
                  { step: '3', title: 'Geo Analysis', desc: 'Addresses are auto-classified as Columbia residents or non-residents with distance calculations.' },
                  { step: '4', title: 'Get Scores', desc: 'Each contact receives a 1-100 score. View results in-app or download the scored CSV.' },
                ].map(item => (
                  <div key={item.step} className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 font-bold text-sm mb-3">
                      {item.step}
                    </div>
                    <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                    <p className="text-sm text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analyzing Step */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
              <Brain className="absolute inset-0 m-auto h-8 w-8 text-violet-400" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Analyzing Member Patterns</h2>
              <p className="text-slate-400">
                Training model on {memberData?.rows.length} members across {analysisFields.length} fields
                {columbiaEnabled && addressField ? ' (including Columbia geo-analysis)' : ''},
                scoring {contactData?.rows.length} contacts...
              </p>
            </div>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && analysisResult && contactData && (
          <div className="space-y-8">
            {/* Show which fields were used */}
            <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-slate-400">
                  <span className="text-slate-300 font-medium">Fields analyzed:</span>{' '}
                  {analysisFields.join(', ')}
                </p>
                {excludedFields.size > 0 && (
                  <p className="text-xs text-slate-500">
                    {excludedFields.size} field{excludedFields.size !== 1 ? 's' : ''} excluded:{' '}
                    {Array.from(excludedFields).join(', ')}
                  </p>
                )}
              </div>
            </div>

            <AnalysisDashboard result={analysisResult} />

            {/* Columbia Insights in Results */}
            {columbiaEnabled && memberColumbiaSummary && contactColumbiaSummary && (
              <ColumbiaInsights
                memberSummary={memberColumbiaSummary}
                contactSummary={contactColumbiaSummary}
              />
            )}

            <FeatureInsights features={analysisResult.featureImportances} />
            <ResultsTable
              predictions={analysisResult.predictions}
              headers={contactData.headers}
              onDownload={handleDownload}
              columbiaEnabled={columbiaEnabled}
            />
          </div>
        )}
      </main>
    </div>
  );
}

// Enhanced CSV generator that handles arbitrary headers
function generateCSVEnhanced(
  data: Record<string, string>[],
  headers: string[]
): string {
  const rows = data.map(row => {
    const values = headers.map(h => {
      const val = row[h] || '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    return values.join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}
