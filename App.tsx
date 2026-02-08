import { useState, useCallback, useMemo } from 'react';
import { parseCSV, generateCSV, downloadCSV } from './utils/csv';
import type { CSVData } from './utils/csv';
import { analyzeAndPredict } from './ml/engine';
import type { AnalysisResult } from './ml/engine';
import { FileUploadCard } from './components/FileUploadCard';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { ResultsTable } from './components/ResultsTable';
import { FeatureInsights } from './components/FeatureInsights';
import { FieldSelector, isLikelyContactField } from './components/FieldSelector';
import {
  Brain,
  Download,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

type AppStep = 'upload' | 'analyzing' | 'results';

export function App() {
  const [memberData, setMemberData] = useState<CSVData | null>(null);
  const [contactData, setContactData] = useState<CSVData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [step, setStep] = useState<AppStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [excludedFields, setExcludedFields] = useState<Set<string>>(new Set());

  // Compute shared fields between both CSVs
  const sharedFields = useMemo(() => {
    if (!memberData || !contactData) return [];
    return memberData.headers.filter(h => contactData.headers.includes(h));
  }, [memberData, contactData]);

  // Compute which fields will actually be used for analysis
  const analysisFields = useMemo(() => {
    return sharedFields.filter(f => !excludedFields.has(f));
  }, [sharedFields, excludedFields]);

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

  // Run auto-detect whenever both files are first loaded
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

  // When both datasets become available, auto-detect exclusions
  const prevBothLoaded = useMemo(() => {
    return memberData !== null && contactData !== null;
  }, [memberData, contactData]);

  // We use a separate effect-like mechanism: check on each render
  // if we just got both files, run auto-detect. We track this via a ref-like approach.
  const [autoDetectRan, setAutoDetectRan] = useState(false);
  if (prevBothLoaded && !autoDetectRan) {
    // Compute auto exclusions synchronously on first load
    const autoExcluded = new Set<string>();
    const fields = memberData!.headers.filter(h => contactData!.headers.includes(h));
    fields.forEach(field => {
      if (isLikelyContactField(field)) {
        autoExcluded.add(field);
      }
    });
    setExcludedFields(autoExcluded);
    setAutoDetectRan(true);
  }

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
        // Pass only the included fields (not excluded) to the ML engine
        const result = analyzeAndPredict(
          memberData.rows,
          contactData.rows,
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
  }, [memberData, contactData, analysisFields]);

  const handleDownload = useCallback(() => {
    if (!analysisResult || !contactData) return;

    const scoreMap = new Map(
      analysisResult.predictions.map(p => {
        const key = JSON.stringify(p.originalData);
        return [key, p.score];
      })
    );

    const scores = contactData.rows.map(row => {
      const key = JSON.stringify(row);
      return scoreMap.get(key) || 0;
    });

    const csv = generateCSV(contactData.rows, scores, contactData.headers);
    const fileName = contactData.fileName.replace('.csv', '') + '_scored.csv';
    downloadCSV(csv, fileName);
  }, [analysisResult, contactData]);

  const resetApp = useCallback(() => {
    setMemberData(null);
    setContactData(null);
    setAnalysisResult(null);
    setStep('upload');
    setError(null);
    setExcludedFields(new Set());
    setAutoDetectRan(false);
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

            {/* Field Selector — replaces the old static "Shared Data Fields" section */}
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
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { step: '1', title: 'Upload Data', desc: 'Provide your member list and a contact list as CSV files with shared data columns.' },
                  { step: '2', title: 'Select Fields', desc: 'Choose which data points to analyze. Exclude contact-only fields like name, email, and phone.' },
                  { step: '3', title: 'Get Scores', desc: 'Each contact receives a 1-100 score. View results in-app or download the scored CSV.' },
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
                Training model on {memberData?.rows.length} members across {analysisFields.length} fields,
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
              <div className="flex items-center justify-between">
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
            <FeatureInsights features={analysisResult.featureImportances} />
            <ResultsTable
              predictions={analysisResult.predictions}
              headers={contactData.headers}
              onDownload={handleDownload}
            />
          </div>
        )}
      </main>
    </div>
  );
}
