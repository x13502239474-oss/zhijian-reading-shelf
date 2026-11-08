import { THEME_LABEL, type ReadingTheme } from '../../types';

const THEMES: { key: ReadingTheme; color: string; ring: string }[] = [
  { key: 'warm', color: '#f2e4c6', ring: '#b9a077' },
  { key: 'white', color: '#ffffff', ring: '#b9b9b4' },
  { key: 'eye', color: '#dbe8d5', ring: '#94ad91' },
  { key: 'night', color: '#2b2c28', ring: '#6a6a61' },
];

interface ThemePickerProps {
  value: ReadingTheme;
  onChange: (theme: ReadingTheme) => void;
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="theme-dots" role="group" aria-label="阅读主题">
      {THEMES.map((theme) => (
        <button
          key={theme.key}
          type="button"
          className={`theme-dot${value === theme.key ? ' is-active' : ''}`}
          style={{ backgroundColor: theme.color, borderColor: theme.ring }}
          title={THEME_LABEL[theme.key]}
          aria-label={`${THEME_LABEL[theme.key]}主题`}
          aria-pressed={value === theme.key}
          onClick={() => onChange(theme.key)}
        />
      ))}
    </div>
  );
}

export { THEMES };
