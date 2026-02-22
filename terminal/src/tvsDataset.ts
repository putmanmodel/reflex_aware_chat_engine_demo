import fs from "node:fs";
import path from "node:path";

export type DatasetHit = { sentence: string; toneSig: string; label: string };

type DatasetRow = DatasetHit;

const datasetMap = new Map<string, DatasetHit>();

function normalizeSentence(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function getDataDir(): string {
  return path.resolve(__dirname, "..", "..", "data");
}

function loadDataset(): void {
  const dataDir = getDataDir();
  const files = fs
    .readdirSync(dataDir)
    .filter((name) => /^block\d+\.json$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of files) {
    const filePath = path.join(dataDir, fileName);
    const raw = fs.readFileSync(filePath, "utf8");
    const rows = JSON.parse(raw) as DatasetRow[];

    for (const row of rows) {
      const key = normalizeSentence(row.sentence);
      if (!datasetMap.has(key)) {
        datasetMap.set(key, {
          sentence: row.sentence,
          toneSig: row.toneSig,
          label: row.label,
        });
      }
    }
  }
}

loadDataset();

export function lookupSentence(text: string): DatasetHit | null {
  const key = normalizeSentence(text);
  return datasetMap.get(key) ?? null;
}
