import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light';

type DashboardUiState = {
  theme: ThemeMode;
  selectedState: string;
  setSelectedState: (code: string) => void;
};

const DashboardUiContext = createContext<DashboardUiState | null>(null);

export function DashboardUiProvider({ children }: { children: ReactNode }) {
  const [selectedState, setSelectedState] = useState('CA');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  }, []);

  const value = useMemo(
    () => ({
      theme: 'light' as const,
      selectedState,
      setSelectedState,
    }),
    [selectedState],
  );

  return <DashboardUiContext.Provider value={value}>{children}</DashboardUiContext.Provider>;
}

export function useDashboardUi(): DashboardUiState {
  const ctx = useContext(DashboardUiContext);
  if (!ctx) throw new Error('useDashboardUi must be used within DashboardUiProvider');
  return ctx;
}
