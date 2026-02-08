// ML Engine for membership prediction
// Implements logistic regression with feature importance analysis

export interface FeatureImportance {
  field: string;
  importance: number; // 0-100 scale
  correlation: number; // -1 to 1
  confidence: number; // 0-100%
  direction: 'positive' | 'negative';
  explanation: string;
}

export interface PredictionResult {
  originalData: Record<string, string>;
  score: number; // 1-100
  factors: { field: string; contribution: number }[];
}

export interface AnalysisResult {
  featureImportances: FeatureImportance[];
  predictions: PredictionResult[];
  modelAccuracy: number;
  totalMembers: number;
  totalContacts: number;
}

// ============================================================
// COLUMN TYPE DETECTION
// ============================================================

type ColumnType = 'days_since' | 'date' | 'age' | 'numeric' | 'boolean' | 'binary_gender' | 'binary_parental' | 'categorical' | 'distance';

// Detect if a column contains date values
function isDateColumn(values: string[]): boolean {
  const nonEmpty = values.filter(v => v && v.trim() !== '');
  if (nonEmpty.length === 0) return false;
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
    /^\d{1,2}-\d{1,2}-\d{2,4}$/,
    /^\w+ \d{1,2},? \d{4}$/,
    /^\d{1,2} \w+ \d{4}$/,
  ];
  const dateCount = nonEmpty.filter(v => {
    const trimmed = v.trim();
    return datePatterns.some(p => p.test(trimmed)) || (!isNaN(Date.parse(trimmed)) && trimmed.length > 6);
  }).length;
  return (dateCount / nonEmpty.length) > 0.7;
}

// Check if a column is a binary field with specific semantics
function isBinaryGender(colName: string, values: string[]): boolean {
  const lower = colName.toLowerCase();
  if (!lower.includes('gender') && !lower.includes('sex')) return false;
  const nonEmpty = values.filter(v => v && v.trim() !== '');
  const uniqueVals = new Set(nonEmpty.map(v => v.toLowerCase().trim()));
  // Must have exactly 2 unique values
  return uniqueVals.size === 2;
}

function isBinaryParental(colName: string, values: string[]): boolean {
  const lower = colName.toLowerCase();
  if (!lower.includes('parent') && !lower.includes('parental') && !lower.includes('children') && !lower.includes('kids')) return false;
  const nonEmpty = values.filter(v => v && v.trim() !== '');
  const uniqueVals = new Set(nonEmpty.map(v => v.toLowerCase().trim()));
  return uniqueVals.size === 2;
}

function detectColumnType(colName: string, values: string[]): ColumnType {
  const lower = colName.toLowerCase();

  // Check for binary gender
  if (isBinaryGender(colName, values)) return 'binary_gender';

  // Check for binary parental status
  if (isBinaryParental(colName, values)) return 'binary_parental';

  // Check for "last visit" type date columns — these become "days since"
  if (isDateColumn(values)) {
    if (lower.includes('visit') || lower.includes('last') || lower.includes('recent') || lower.includes('activity')) {
      return 'days_since';
    }
    return 'date';
  }

  // Check for age-related columns
  if (lower === 'age' || lower.includes('_age') || lower.includes('age_')) return 'age';

  // Check for distance columns
  if (lower.includes('distance') || lower.includes('dist_') || lower.includes('_mi') || lower.includes('miles')) return 'distance';

  // Check if boolean-like
  const nonEmpty = values.filter(v => v && v.trim() !== '');
  const boolValues = ['yes', 'no', 'true', 'false', '1', '0', 'y', 'n', 'active', 'inactive'];
  const boolCount = nonEmpty.filter(v => boolValues.includes(v.toLowerCase().trim())).length;
  if (nonEmpty.length > 0 && (boolCount / nonEmpty.length) > 0.7) return 'boolean';

  // Check if numeric
  const numCount = nonEmpty.filter(v => !isNaN(parseFloat(v))).length;
  if (nonEmpty.length > 0 && (numCount / nonEmpty.length) > 0.7) return 'numeric';

  return 'categorical';
}

// ============================================================
// VALUE ENCODING
// ============================================================

// Convert a date string to "days since today" (higher = longer ago)
function dateToDaysSince(value: string): number {
  if (!value || value.trim() === '') return 999; // treat missing as very long ago
  const trimmed = value.trim();
  const ts = Date.parse(trimmed);
  if (isNaN(ts)) return 999;
  const now = Date.now();
  const diffMs = now - ts;
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  return diffDays;
}

// Parse a date string to epoch timestamp (milliseconds)
function parseDate(value: string): number {
  if (!value || value.trim() === '') return 0;
  const trimmed = value.trim();
  const ts = Date.parse(trimmed);
  if (!isNaN(ts)) return ts;
  return 0;
}

// Encode a value to a number based on column type
function encodeValue(value: string, colType?: ColumnType): number {
  if (value === '' || value === null || value === undefined) return 0;

  // Days since: convert date to number of days since today
  if (colType === 'days_since') {
    return dateToDaysSince(value);
  }

  // Date: parse as timestamp
  if (colType === 'date') {
    return parseDate(value);
  }

  const num = parseFloat(value);
  if (!isNaN(num)) return num;

  // For boolean-like
  const lower = value.toLowerCase().trim();
  if (['yes', 'true', '1', 'y', 'active'].includes(lower)) return 1;
  if (['no', 'false', '0', 'n', 'inactive'].includes(lower)) return 0;

  // For binary gender: encode consistently
  if (['male', 'm'].includes(lower)) return 1;
  if (['female', 'f'].includes(lower)) return 0;

  // For parental status
  if (['parent', 'yes'].includes(lower)) return 1;
  if (['non-parent', 'non parent', 'nonparent', 'no', 'none', 'childless'].includes(lower)) return 0;

  // Hash string to number deterministically
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// ============================================================
// DATA PREPROCESSING
// ============================================================

function preprocessData(
  data: Record<string, string>[],
  columns: string[]
): { matrix: number[][]; featureNames: string[]; categoricalMaps: Map<string, Map<string, number>>; columnTypes: Map<string, ColumnType> } {
  const categoricalMaps = new Map<string, Map<string, number>>();
  const featureNames: string[] = [];
  const columnTypes = new Map<string, ColumnType>();

  // Determine column types
  const isNumericLike = new Map<string, boolean>();
  for (const col of columns) {
    const values = data.map(row => row[col]?.trim() || '').filter(v => v !== '');
    const colType = detectColumnType(col, values);
    columnTypes.set(col, colType);

    // These types are encoded as single numeric features
    isNumericLike.set(col, ['days_since', 'date', 'age', 'numeric', 'boolean', 'distance'].includes(colType));
  }

  // Build feature names and categorical maps
  for (const col of columns) {
    const colType = columnTypes.get(col)!;

    if (isNumericLike.get(col)) {
      featureNames.push(col);
    } else if (colType === 'binary_gender' || colType === 'binary_parental') {
      // Binary fields: encode as single numeric feature (not one-hot)
      featureNames.push(col);
    } else {
      // Categorical: one-hot encode
      const uniqueValues = new Set<string>();
      data.forEach(row => {
        const val = (row[col] || '').trim();
        if (val) uniqueValues.add(val);
      });
      const valueMap = new Map<string, number>();
      const uniqueArr = Array.from(uniqueValues);
      const limitedValues = uniqueArr.slice(0, 20);
      limitedValues.forEach((v, i) => {
        valueMap.set(v, i);
        featureNames.push(`${col}::${v}`);
      });
      categoricalMaps.set(col, valueMap);
    }
  }

  // Build feature matrix
  const matrix: number[][] = [];
  for (const row of data) {
    const features: number[] = [];
    for (const col of columns) {
      const colType = columnTypes.get(col)!;

      if (isNumericLike.get(col) || colType === 'binary_gender' || colType === 'binary_parental') {
        features.push(encodeValue(row[col] || '', colType));
      } else {
        const valueMap = categoricalMaps.get(col)!;
        const val = (row[col] || '').trim();
        for (const [category] of valueMap) {
          features.push(val === category ? 1 : 0);
        }
      }
    }
    matrix.push(features);
  }

  return { matrix, featureNames, categoricalMaps, columnTypes };
}

// ============================================================
// NORMALIZATION & MATH
// ============================================================

function normalizeMatrix(matrix: number[][]): { normalized: number[][]; mins: number[]; maxs: number[] } {
  if (matrix.length === 0) return { normalized: [], mins: [], maxs: [] };
  const numFeatures = matrix[0].length;
  const mins = new Array(numFeatures).fill(Infinity);
  const maxs = new Array(numFeatures).fill(-Infinity);

  for (const row of matrix) {
    for (let j = 0; j < numFeatures; j++) {
      if (row[j] < mins[j]) mins[j] = row[j];
      if (row[j] > maxs[j]) maxs[j] = row[j];
    }
  }

  const normalized = matrix.map(row =>
    row.map((val, j) => {
      const range = maxs[j] - mins[j];
      return range === 0 ? 0 : (val - mins[j]) / range;
    })
  );

  return { normalized, mins, maxs };
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

// ============================================================
// LOGISTIC REGRESSION
// ============================================================

function trainLogisticRegression(
  X: number[][],
  y: number[],
  learningRate = 0.1,
  iterations = 1000,
  lambda = 0.01
): { weights: number[]; bias: number } {
  const numFeatures = X[0]?.length || 0;
  const weights = new Array(numFeatures).fill(0);
  let bias = 0;
  const m = X.length;

  for (let iter = 0; iter < iterations; iter++) {
    const dw = new Array(numFeatures).fill(0);
    let db = 0;

    for (let i = 0; i < m; i++) {
      let z = bias;
      for (let j = 0; j < numFeatures; j++) {
        z += weights[j] * X[i][j];
      }
      const pred = sigmoid(z);
      const error = pred - y[i];

      for (let j = 0; j < numFeatures; j++) {
        dw[j] += error * X[i][j] + (lambda * weights[j] / m);
      }
      db += error;
    }

    for (let j = 0; j < numFeatures; j++) {
      weights[j] -= (learningRate / m) * dw[j];
    }
    bias -= (learningRate / m) * db;
  }

  return { weights, bias };
}

// ============================================================
// CORRELATION
// ============================================================

function calculateCorrelation(feature: number[], labels: number[]): number {
  const n = feature.length;
  if (n === 0) return 0;

  const meanX = feature.reduce((a, b) => a + b, 0) / n;
  const meanY = labels.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = feature[i] - meanX;
    const dy = labels[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : numerator / denom;
}

// ============================================================
// BINARY FIELD HELPERS
// Get the two values of a binary column
// ============================================================

function getBinaryValues(data: Record<string, string>[], col: string): [string, string] | null {
  const vals = new Set<string>();
  for (const row of data) {
    const v = (row[col] || '').trim();
    if (v) vals.add(v);
  }
  if (vals.size !== 2) return null;
  const arr = Array.from(vals);
  return [arr[0], arr[1]];
}

// ============================================================
// EXPLANATION GENERATION
// ============================================================

function generateExplanation(
  name: string,
  colType: ColumnType,
  direction: 'positive' | 'negative',
  corrPct: number,
  confidence: number,
  allData: Record<string, string>[]
): string {
  const friendlyName = name.replace(/_/g, ' ');

  // CATEGORICAL (one-hot encoded)
  if (name.includes('::')) {
    const [field, value] = name.split('::');
    return direction === 'positive'
      ? `Having "${value}" as ${field.replace(/_/g, ' ')} is associated with higher membership likelihood (${corrPct}% correlation, ${confidence}% confidence).`
      : `Having "${value}" as ${field.replace(/_/g, ' ')} is associated with lower membership likelihood (${corrPct}% correlation, ${confidence}% confidence).`;
  }

  // DAYS SINCE (e.g., date_of_last_visit converted to days)
  if (colType === 'days_since') {
    // For days_since: the value is "number of days since last visit"
    // Negative weight means: higher days_since (longer ago) → LESS likely to be member
    // So we flip the explanation to be intuitive
    if (direction === 'negative') {
      return `People who visited more recently (fewer days since last visit) are more likely to be members (${corrPct}% correlation, ${confidence}% confidence). Each additional day since the last visit decreases the likelihood of membership.`;
    } else {
      return `People who visited less recently (more days since last visit) are, surprisingly, more associated with membership (${corrPct}% correlation, ${confidence}% confidence). This may indicate long-term loyal members who don't need to visit frequently.`;
    }
  }

  // DATE (generic date field like birthdate)
  if (colType === 'date') {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('birth')) {
      return direction === 'positive'
        ? `Younger individuals (more recent birthdates) are more likely to be members (${corrPct}% correlation, ${confidence}% confidence).`
        : `Older individuals (earlier birthdates) are more likely to be members (${corrPct}% correlation, ${confidence}% confidence).`;
    }
    return direction === 'positive'
      ? `More recent dates in ${friendlyName} correlate with membership (${corrPct}% correlation, ${confidence}% confidence).`
      : `Earlier dates in ${friendlyName} correlate with membership (${corrPct}% correlation, ${confidence}% confidence).`;
  }

  // BINARY GENDER
  if (colType === 'binary_gender') {
    const binaryVals = getBinaryValues(allData, name);
    if (binaryVals) {
      // Determine which maps to 1 and which maps to 0
      const val1Encoded = encodeValue(binaryVals[0], 'binary_gender');
      const val0 = val1Encoded === 1 ? binaryVals[1] : binaryVals[0];
      const val1 = val1Encoded === 1 ? binaryVals[0] : binaryVals[1];
      // positive direction means higher encoded value (1) → more likely → that's val1
      const moreLikely = direction === 'positive' ? val1 : val0;
      const lessLikely = direction === 'positive' ? val0 : val1;
      return `${moreLikely} individuals are more likely to be members than ${lessLikely} individuals (${corrPct}% correlation, ${confidence}% confidence). Note: with only two categories, one must be more likely and the other less likely — the degree of certainty may be low if both genders are well-represented among members.`;
    }
  }

  // BINARY PARENTAL STATUS
  if (colType === 'binary_parental') {
    const binaryVals = getBinaryValues(allData, name);
    if (binaryVals) {
      const val1Encoded = encodeValue(binaryVals[0], 'binary_parental');
      const val0 = val1Encoded === 1 ? binaryVals[1] : binaryVals[0];
      const val1 = val1Encoded === 1 ? binaryVals[0] : binaryVals[1];
      const moreLikely = direction === 'positive' ? val1 : val0;
      const lessLikely = direction === 'positive' ? val0 : val1;
      return `Individuals with "${moreLikely}" parental status are more likely to be members than those with "${lessLikely}" status (${corrPct}% correlation, ${confidence}% confidence). As a binary field, one category must be more likely and the other less — the confidence level indicates how strong this distinction is.`;
    }
  }

  // AGE
  if (colType === 'age') {
    return direction === 'positive'
      ? `Older individuals (higher age) are more likely to be members (${corrPct}% correlation, ${confidence}% confidence). The typical member tends to be older than the typical non-member.`
      : `Younger individuals (lower age) are more likely to be members (${corrPct}% correlation, ${confidence}% confidence). The typical member tends to be younger than the typical non-member.`;
  }

  // DISTANCE
  if (colType === 'distance') {
    return direction === 'positive'
      ? `Greater distance from Columbia is associated with membership (${corrPct}% correlation, ${confidence}% confidence). This is unusual — members tend to live farther away.`
      : `Closer proximity to Columbia correlates with membership (${corrPct}% correlation, ${confidence}% confidence). Members tend to live nearer to Columbia, MD.`;
  }

  // BOOLEAN
  if (colType === 'boolean') {
    return direction === 'positive'
      ? `A "yes" or positive value for ${friendlyName} correlates with membership (${corrPct}% correlation, ${confidence}% confidence).`
      : `A "no" or negative value for ${friendlyName} correlates with membership (${corrPct}% correlation, ${confidence}% confidence).`;
  }

  // GENERIC NUMERIC
  return direction === 'positive'
    ? `Higher ${friendlyName} values correlate with membership (${corrPct}% correlation, ${confidence}% confidence). Members tend to have higher ${friendlyName} than non-members.`
    : `Lower ${friendlyName} values correlate with membership (${corrPct}% correlation, ${confidence}% confidence). Members tend to have lower ${friendlyName} than non-members.`;
}

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================

export function analyzeAndPredict(
  memberData: Record<string, string>[],
  contactData: Record<string, string>[],
  memberColumns: string[],
  contactColumns: string[]
): AnalysisResult {
  // Find common columns
  const commonColumns = memberColumns.filter(c => contactColumns.includes(c));

  if (commonColumns.length === 0) {
    throw new Error('No common columns found between member and contact lists. Please ensure both CSVs share at least some column headers.');
  }

  // Create combined dataset: members = 1, contacts = 0
  const allData = [
    ...memberData.map(row => ({ data: row, label: 1 })),
    ...contactData.map(row => ({ data: row, label: 0 }))
  ];

  const allRecords = allData.map(d => d.data);
  const labels = allData.map(d => d.label);
  const { matrix, featureNames, columnTypes } = preprocessData(allRecords, commonColumns);

  // Normalize
  const { normalized } = normalizeMatrix(matrix);

  // Split into member and contact portions
  const memberMatrix = normalized.slice(0, memberData.length);
  const contactMatrix = normalized.slice(memberData.length);

  // Train model
  const { weights, bias } = trainLogisticRegression(normalized, labels, 0.5, 2000, 0.01);

  // Calculate model accuracy
  let correct = 0;
  for (let i = 0; i < normalized.length; i++) {
    let z = bias;
    for (let j = 0; j < weights.length; j++) {
      z += weights[j] * normalized[i][j];
    }
    const pred = sigmoid(z) >= 0.5 ? 1 : 0;
    if (pred === labels[i]) correct++;
  }
  const modelAccuracy = Math.round((correct / normalized.length) * 100);

  // ============================================================
  // FEATURE IMPORTANCE CALCULATION
  // ============================================================

  const maxAbsWeight = Math.max(...weights.map(Math.abs), 0.001);

  const featureImportances: FeatureImportance[] = featureNames.map((name, idx) => {
    const featureCol = normalized.map(row => row[idx]);
    const correlation = calculateCorrelation(featureCol, labels);
    const importance = Math.round((Math.abs(weights[idx]) / maxAbsWeight) * 100);

    // Calculate confidence
    const memberVals = memberMatrix.map(row => row[idx]);
    const contactVals = contactMatrix.map(row => row[idx]);
    const memberMean = memberVals.reduce((a, b) => a + b, 0) / Math.max(memberVals.length, 1);
    const contactMean = contactVals.reduce((a, b) => a + b, 0) / Math.max(contactVals.length, 1);
    const diff = Math.abs(memberMean - contactMean);
    const confidence = Math.min(99, Math.round(diff * 100 * Math.sqrt(Math.min(memberVals.length, contactVals.length) / 10)));

    const direction: 'positive' | 'negative' = weights[idx] >= 0 ? 'positive' : 'negative';
    const corrPct = Math.round(Math.abs(correlation) * 100);

    // Get the base column name
    const baseColName = name.includes('::') ? name.split('::')[0] : name;
    const colType = columnTypes.get(baseColName) || 'numeric';

    const explanation = generateExplanation(
      name, colType, direction, corrPct, Math.max(1, confidence),
      allRecords
    );

    return {
      field: name,
      importance,
      correlation: Math.round(correlation * 100) / 100,
      confidence: Math.max(1, confidence),
      direction,
      explanation
    };
  });

  // ============================================================
  // POST-PROCESS BINARY FIELDS
  // For binary fields (gender, parental), ensure one value is
  // "more likely" and the other is "less likely". Since they're
  // encoded as a single numeric feature (not one-hot), this is
  // already enforced by the model weight direction. But we add
  // a complementary entry to make both values visible.
  // ============================================================

  const binarySupplements: FeatureImportance[] = [];

  for (const [col, colType] of columnTypes.entries()) {
    if (colType === 'binary_gender' || colType === 'binary_parental') {
      const mainEntry = featureImportances.find(f => f.field === col);
      if (!mainEntry) continue;

      const binaryVals = getBinaryValues(allRecords, col);
      if (!binaryVals) continue;

      // Determine which value maps to which
      const val0Encoded = encodeValue(binaryVals[0], colType);
      const encodedAs1 = val0Encoded === 1 ? binaryVals[0] : binaryVals[1];
      const encodedAs0 = val0Encoded === 1 ? binaryVals[1] : binaryVals[0];

      // The main entry's direction tells us: positive = encoded-as-1 is more likely
      const moreLikely = mainEntry.direction === 'positive' ? encodedAs1 : encodedAs0;
      const lessLikely = mainEntry.direction === 'positive' ? encodedAs0 : encodedAs1;

      // Rename the main entry to be specific
      mainEntry.field = `${col} (${moreLikely})`;
      if (colType === 'binary_gender') {
        mainEntry.explanation = `${moreLikely} individuals are more likely to be members than ${lessLikely} individuals (${Math.round(Math.abs(mainEntry.correlation) * 100)}% correlation, ${mainEntry.confidence}% confidence). As a binary field, one gender must be more likely and the other less likely. The confidence level indicates how strong this distinction is.`;
      } else {
        mainEntry.explanation = `Individuals with "${moreLikely}" parental status are more likely to be members than those with "${lessLikely}" status (${Math.round(Math.abs(mainEntry.correlation) * 100)}% correlation, ${mainEntry.confidence}% confidence). As a binary field, one status must be more likely and the other less likely.`;
      }
      mainEntry.direction = 'positive'; // this is the "more likely" value

      // Create the complementary "less likely" entry
      binarySupplements.push({
        field: `${col} (${lessLikely})`,
        importance: mainEntry.importance,
        correlation: -mainEntry.correlation,
        confidence: mainEntry.confidence,
        direction: 'negative',
        explanation: colType === 'binary_gender'
          ? `${lessLikely} individuals are less likely to be members than ${moreLikely} individuals (${Math.round(Math.abs(mainEntry.correlation) * 100)}% correlation, ${mainEntry.confidence}% confidence). This is the complementary result of the gender analysis above.`
          : `Individuals with "${lessLikely}" parental status are less likely to be members than those with "${moreLikely}" status (${Math.round(Math.abs(mainEntry.correlation) * 100)}% correlation, ${mainEntry.confidence}% confidence). This is the complementary result of the parental status analysis.`
      });
    }
  }

  // Add binary supplements adjacent to their main entries
  const finalImportances: FeatureImportance[] = [];
  for (const fi of featureImportances) {
    finalImportances.push(fi);
    // Check if there's a supplement for this field's base column
    const baseCol = fi.field.includes(' (') ? fi.field.split(' (')[0] : fi.field;
    const supplement = binarySupplements.find(s => s.field.startsWith(baseCol + ' (') && s.field !== fi.field);
    if (supplement) {
      finalImportances.push(supplement);
      // Remove from supplements so we don't add it again
      const idx = binarySupplements.indexOf(supplement);
      binarySupplements.splice(idx, 1);
    }
  }
  // Add any remaining supplements
  finalImportances.push(...binarySupplements);

  // Sort by importance (keeping binary pairs adjacent)
  // Group by base column, sort groups by max importance, keep pairs together
  const groupedImportances: FeatureImportance[][] = [];
  const seen = new Set<string>();
  for (const fi of finalImportances) {
    const baseCol = fi.field.includes(' (') ? fi.field.split(' (')[0] : (fi.field.includes('::') ? fi.field.split('::')[0] : fi.field);
    if (seen.has(baseCol)) continue;
    seen.add(baseCol);
    const group = finalImportances.filter(f => {
      const fBase = f.field.includes(' (') ? f.field.split(' (')[0] : (f.field.includes('::') ? f.field.split('::')[0] : f.field);
      return fBase === baseCol;
    });
    groupedImportances.push(group);
  }
  groupedImportances.sort((a, b) => Math.max(...b.map(f => f.importance)) - Math.max(...a.map(f => f.importance)));
  const sortedImportances = groupedImportances.flat();

  // ============================================================
  // PREDICTIONS
  // ============================================================

  const predictions: PredictionResult[] = contactData.map((contact, idx) => {
    let z = bias;
    const factors: { field: string; contribution: number }[] = [];

    for (let j = 0; j < weights.length; j++) {
      const contribution = weights[j] * contactMatrix[idx][j];
      factors.push({
        field: featureNames[j],
        contribution: Math.round(contribution * 100) / 100
      });
    }

    // Recalculate z properly
    z = bias;
    for (let j = 0; j < weights.length; j++) {
      z += weights[j] * contactMatrix[idx][j];
    }

    const rawScore = sigmoid(z);
    const score = Math.max(1, Math.min(100, Math.round(rawScore * 99 + 1)));

    factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      originalData: contact,
      score,
      factors: factors.slice(0, 10)
    };
  });

  // Sort predictions by score descending
  predictions.sort((a, b) => b.score - a.score);

  return {
    featureImportances: sortedImportances.filter(f => f.importance > 0),
    predictions,
    modelAccuracy,
    totalMembers: memberData.length,
    totalContacts: contactData.length
  };
}
