import { parseDueDate, formatDueDate } from '../dateParser';

describe('parseDueDate', () => {
  it('should parse YYYY-MM-DD format', () => {
    const result = parseDueDate('2025-10-15');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(9); // 0-indexed
    expect(result!.getDate()).toBe(15);
  });

  it('should parse YYYYMMDD format', () => {
    const result = parseDueDate('20251015');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(9);
    expect(result!.getDate()).toBe(15);
  });

  it('should parse date with time', () => {
    const result = parseDueDate('2025-10-15 14:30');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getHours()).toBe(14);
    expect(result!.getMinutes()).toBe(30);
  });

  it('should parse YYYYMMDD with time', () => {
    const result = parseDueDate('20251015 14:30');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getHours()).toBe(14);
    expect(result!.getMinutes()).toBe(30);
  });

  it('should default to 23:59:59.999 when no time given', () => {
    const result = parseDueDate('2025-10-15');
    expect(result!.getHours()).toBe(23);
    expect(result!.getMinutes()).toBe(59);
    expect(result!.getSeconds()).toBe(59);
    expect(result!.getMilliseconds()).toBe(999);
  });

  it('should return null for invalid month', () => {
    expect(parseDueDate('2025-13-15')).toBeNull();
    expect(parseDueDate('2025-00-15')).toBeNull();
  });

  it('should return null for invalid day', () => {
    expect(parseDueDate('2025-10-00')).toBeNull();
    expect(parseDueDate('2025-10-32')).toBeNull();
  });

  it('should return null for invalid hours', () => {
    expect(parseDueDate('2025-10-15 25:00')).toBeNull();
  });

  it('should return null for invalid minutes', () => {
    expect(parseDueDate('2025-10-15 14:60')).toBeNull();
  });

  it('should return null for garbage input', () => {
    expect(parseDueDate('not a date')).toBeNull();
    expect(parseDueDate('')).toBeNull();
    expect(parseDueDate('abc-de-fg')).toBeNull();
  });

  it('should handle leading/trailing whitespace', () => {
    const result = parseDueDate('  2025-10-15  ');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getDate()).toBe(15);
  });
});

describe('formatDueDate', () => {
  it('should format date without time when default end-of-day', () => {
    const date = new Date(2025, 9, 15, 23, 59, 59, 999);
    expect(formatDueDate(date)).toBe('2025-10-15');
  });

  it('should format date with time when not default', () => {
    const date = new Date(2025, 9, 15, 14, 30, 0, 0);
    expect(formatDueDate(date)).toBe('2025-10-15 14:30');
  });

  it('should format midnight as time (not default)', () => {
    const date = new Date(2025, 9, 15, 0, 0, 0, 0);
    expect(formatDueDate(date)).toBe('2025-10-15 00:00');
  });

  it('should pad single-digit months and days', () => {
    const date = new Date(2025, 0, 5, 23, 59);
    expect(formatDueDate(date)).toBe('2025-01-05');
  });
});
