import { getJSON, setJSON } from "./storage";
import { defaultSettings } from "./config";
import type { Dataset, DrawRecord, Settings } from "./types";

const K = { dataset: "dataset", settings: "settings", draws: "draws" };

export const loadDataset = () => getJSON<Dataset>(K.dataset);
export const saveDataset = (d: Dataset) => setJSON(K.dataset, d);

export async function loadSettings(): Promise<Settings> {
  const s = await getJSON<Settings>(K.settings);
  return { ...defaultSettings(), ...(s ?? {}) };
}
export const saveSettings = (s: Settings) => setJSON(K.settings, s);

export async function loadDraws(): Promise<DrawRecord[]> {
  return (await getJSON<DrawRecord[]>(K.draws)) ?? [];
}
export const saveDraws = (d: DrawRecord[]) => setJSON(K.draws, d);
