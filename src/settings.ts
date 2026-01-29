type AppSettings = {
  minimapSize: "small" | "large";
  sidebarCollapsed: boolean;
  userName: string;
};

const SETTINGS_KEY = "energy-transfer-settings:v1";
const LEGACY_MINIMAP_KEY = "energy-transfer:minimap";

const DEFAULT_SETTINGS: AppSettings = {
  minimapSize: "large",
  sidebarCollapsed: false,
  userName: "",
};

const normalizeMinimapSize = (value: unknown): "small" | "large" => {
  return value === "small" ? "small" : "large";
};

const normalizeUserName = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

export const loadSettings = (): AppSettings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        minimapSize: normalizeMinimapSize(parsed.minimapSize),
        sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
        userName: normalizeUserName(parsed.userName),
      };
    }

    const legacyMinimap = window.localStorage.getItem(LEGACY_MINIMAP_KEY);
    if (legacyMinimap) {
      return {
        ...DEFAULT_SETTINGS,
        minimapSize: normalizeMinimapSize(legacyMinimap),
      };
    }
  } catch {
    // Ignore persistence errors (storage quota, privacy mode, etc.)
  }

  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore persistence errors (storage quota, privacy mode, etc.)
  }
};
