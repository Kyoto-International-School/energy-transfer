export const getExportFilename = (rawName: string) => {
  const normalized = rawName
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) return null;

  return `${normalized}-energy-transfer.png`;
};

export const getStorageExportFilename = (rawName?: string) => {
  const normalized = rawName
    ? rawName
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
    : "";

  if (!normalized) return "energy-transfer-storage.json";

  return `${normalized}-energy-transfer-storage.json`;
};
