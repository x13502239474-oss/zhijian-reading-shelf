import { useCallback, useState } from 'react';
import type { ReadingSettings } from '../types';

const STORAGE_KEY = 'zhijian.reading-settings.v1';

export const DEFAULT_SETTINGS: ReadingSettings = {
  theme: 'warm',
  fontSize: 19,
  lineHeight: 1.9,
  fontFamily: 'serif',
  contentWidth: 720,
  columns: 1,
};

function load(): ReadingSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReadingSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useReadingSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(load);

  const update = useCallback((patch: Partial<ReadingSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 隐私模式下 localStorage 可能不可写，设置仍在当前会话生效
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch {
      // 忽略
    }
  }, []);

  return { settings, update, reset };
}
