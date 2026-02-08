import Papa from 'papaparse';

export interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
}

export function parseCSV(file: File): Promise<CSVData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, string>[];
        resolve({ headers, rows, fileName: file.name });
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    });
  });
}

export function generateCSV(
  data: Record<string, string>[],
  scores: number[],
  headers: string[]
): string {
  const allHeaders = [...headers, 'Membership_Score'];
  const rows = data.map((row, idx) => {
    const values = allHeaders.map(h => {
      if (h === 'Membership_Score') return String(scores[idx] || 0);
      const val = row[h] || '';
      // Escape commas and quotes
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    return values.join(',');
  });

  return [allHeaders.join(','), ...rows].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
