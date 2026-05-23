const DEFAULT_FACTOR_LABEL = /^Factor\s+\d+$/i;

export function isDefaultFactorLabel(label: string): boolean {
  return DEFAULT_FACTOR_LABEL.test(label.trim());
}
