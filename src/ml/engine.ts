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

// Encode a categorical value to a number
function encodeValue(value: string): number {
  if (value === '' || value === null || value === undefined) return 0;
  const num = parseFloat(value);
  if (!isNaN(num)) return num;
  // For boolean-like
  const lower = value.toLowerCase().trim();
  if (['yes', 'true', '1', 'y', 'active', 'male', 'employed'].includes(lower)) return 1;
  if (['no', 'false', '0', 'n', 'inactive', 'female', 'unemployed'].includes(lower)) return 0;
  // Hash string to number deterministically
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// One-hot encode categorical columns
function preprocessData(
  data: Record<string, string>[],
  columns: string[]
): { matrix: number[][]; featureNames: string[]; categoricalMaps: Map<string, Map<string, number>> } {
  const categoricalMaps = new Map<string, Map<string, number>>();
  const featureNames: string[] = [];

  // Determine which columns are numeric vs categorical
  const isNumeric = new Map<string, boolean>();
  for (const col of columns) {
    const values = data.map(row => row[col]?.trim() || '').filter(v => v !== '');
    const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;
    const booleanLike = values.filter(v => ['yes', 'no', 'true', 'false', '1', '0', 'y', 'n', 'active', 'inactive'].includes(v.toLowerCase())).length;
    isNumeric.set(col, (numericCount / Math.max(values.length, 1)) > 0.7 || (booleanLike / Math.max(values.length, 1)) > 0.7);
  }

  for (const col of columns) {
    if (isNumeric.get(col)) {
      featureNames.push(col);
    } else {
      // Get unique values for one-hot encoding
      const uniqueValues = new Set<string>();
      data.forEach(row => {
        const val = (row[col] || '').trim();
        if (val) uniqueValues.add(val);
      });
      const valueMap = new Map<string, number>();
      const uniqueArr = Array.from(uniqueValues);
      // Limit to top 20 categories to prevent explosion
      const limitedValues = uniqueArr.slice(0, 20);
      limitedValues.forEach((v, i) => {
        valueMap.set(v, i);
        featureNames.push(`${col}::${v}`);
      });
      categoricalMaps.set(col, valueMap);
    }
  }

  // Build matrix
  const matrix: number[][] = [];
  for (const row of data) {
    const features: number[] = [];
    for (const col of columns) {
      if (isNumeric.get(col)) {
        features.push(encodeValue(row[col] || ''));
      } else {
        const valueMap = categoricalMaps.get(col)!;
        const val = (row[col] || '').trim();
        // One-hot encode
        for (const [category] of valueMap) {
          features.push(val === category ? 1 : 0);
        }
      }
    }
    matrix.push(features);
  }

  return { matrix, featureNames, categoricalMaps };
}

// Normalize features to 0-1 range
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

// normalizeWithParams removed - not needed in current implementation

// Sigmoid function
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

// Train logistic regression using gradient descent
function trainLogisticRegression(
  X: number[][],
  y: number[],
  learningRate = 0.1,
  iterations = 1000,
  lambda = 0.01 // L2 regularization
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

// Calculate point-biserial correlation
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

// Main analysis function
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

  // Create combined dataset for training: members = 1, we need non-members
  // Since we only have members, we'll use the contact list as potential non-members
  // and create a semi-supervised approach
  const allData = [
    ...memberData.map(row => ({ data: row, label: 1 })),
    ...contactData.map(row => ({ data: row, label: 0 }))
  ];

  // Preprocess combined data
  const allRecords = allData.map(d => d.data);
  const { matrix, featureNames } = preprocessData(allRecords, commonColumns);
  const labels = allData.map(d => d.label);

  // Normalize
  const { normalized } = normalizeMatrix(matrix);

  // Split into member and contact portions
  const memberMatrix = normalized.slice(0, memberData.length);
  const contactMatrix = normalized.slice(memberData.length);
  // Labels are used for training: members=1, contacts=0

  // Train model using all data
  const { weights, bias } = trainLogisticRegression(normalized, labels, 0.5, 2000, 0.01);

  // Calculate model accuracy on training data
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

  // Calculate feature importances
  const maxAbsWeight = Math.max(...weights.map(Math.abs), 0.001);
  const featureImportances: FeatureImportance[] = featureNames.map((name, idx) => {
    const featureCol = normalized.map(row => row[idx]);
    const correlation = calculateCorrelation(featureCol, labels);
    const importance = Math.round((Math.abs(weights[idx]) / maxAbsWeight) * 100);

    // Calculate confidence based on variance and sample size
    const memberVals = memberMatrix.map(row => row[idx]);
    const contactVals = contactMatrix.map(row => row[idx]);
    const memberMean = memberVals.reduce((a, b) => a + b, 0) / Math.max(memberVals.length, 1);
    const contactMean = contactVals.reduce((a, b) => a + b, 0) / Math.max(contactVals.length, 1);
    const diff = Math.abs(memberMean - contactMean);
    const confidence = Math.min(99, Math.round(diff * 100 * Math.sqrt(Math.min(memberVals.length, contactVals.length) / 10)));

    const displayName = name.includes('::') ? name : name;
    const direction: 'positive' | 'negative' = weights[idx] >= 0 ? 'positive' : 'negative';

    let explanation: string;
    if (name.includes('::')) {
      const [field, value] = name.split('::');
      explanation = direction === 'positive'
        ? `Having "${value}" as ${field} is associated with higher membership likelihood (${Math.round(Math.abs(correlation) * 100)}% correlation).`
        : `Having "${value}" as ${field} is associated with lower membership likelihood (${Math.round(Math.abs(correlation) * 100)}% correlation).`;
    } else {
      explanation = direction === 'positive'
        ? `Higher values of ${name} correlate with membership (${Math.round(Math.abs(correlation) * 100)}% correlation strength).`
        : `Lower values of ${name} correlate with membership (${Math.round(Math.abs(correlation) * 100)}% correlation strength).`;
    }

    return {
      field: displayName,
      importance,
      correlation: Math.round(correlation * 100) / 100,
      confidence: Math.max(1, confidence),
      direction,
      explanation
    };
  });

  // Sort by importance
  featureImportances.sort((a, b) => b.importance - a.importance);

  // Predict scores for contacts
  const predictions: PredictionResult[] = contactData.map((contact, idx) => {
    let z = bias;
    const factors: { field: string; contribution: number }[] = [];

    for (let j = 0; j < weights.length; j++) {
      const contribution = weights[j] * contactMatrix[idx][j];
      z += contribution; // already added above, recalculate
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
    // Scale to 1-100
    const score = Math.max(1, Math.min(100, Math.round(rawScore * 99 + 1)));

    factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      originalData: contact,
      score,
      factors: factors.slice(0, 10) // top 10 contributing factors
    };
  });

  // Sort predictions by score descending
  predictions.sort((a, b) => b.score - a.score);

  return {
    featureImportances: featureImportances.filter(f => f.importance > 0),
    predictions,
    modelAccuracy,
    totalMembers: memberData.length,
    totalContacts: contactData.length
  };
}
