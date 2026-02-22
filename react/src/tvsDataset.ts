import datasetRows from "./data/dataset.json";

export type DatasetHit = {
  sentence: string;
  toneSig: string;
  label: string;
};

type DatasetRow = DatasetHit;

const datasetMap = new Map<string, DatasetHit>();

function normalizeSentence(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildDatasetMap(rows: DatasetRow[]): void {
  for (const row of rows) {
    const key = normalizeSentence(row.sentence);
    if (!datasetMap.has(key)) {
      datasetMap.set(key, row);
    }
  }
}

buildDatasetMap(datasetRows as DatasetRow[]);

export function lookupSentence(text: string): DatasetHit | null {
  const key = normalizeSentence(text);
  return datasetMap.get(key) ?? null;
}
