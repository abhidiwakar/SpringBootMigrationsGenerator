import yaml from 'js-yaml';

export function parseYaml(content: string): unknown {
  return yaml.load(content);
}

export function dumpYaml(value: unknown): string {
  return yaml.dump(value, { lineWidth: 120, noRefs: true });
}

export function flattenObject(value: unknown, prefix = ''): Record<string, string | boolean | number | null> {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return prefix ? { [prefix]: value } : {};
  }

  if (Array.isArray(value) || typeof value !== 'object') {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string | boolean | number | null>>(
    (result, [key, child]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      return { ...result, ...flattenObject(child, nextPrefix) };
    },
    {}
  );
}
