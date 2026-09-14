const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const parseDateOnly = (value?: string | Date | null): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const trimmed = value.trim();
  const dateOnlyMatch = ISO_DATE_ONLY.exec(trimmed);
  if (dateOnlyMatch) {
    const parsed = new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3])
    );
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

export const toDateInputValue = (value: Date | string | null | undefined) => {
  const parsed = parseDateOnly(value ?? null);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseTimeOnDate = (baseDate: Date, time: string): Date | null => {
  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number.parseInt(hoursStr ?? "", 10);
  const minutes = Number.parseInt(minutesStr ?? "", 10);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

export const getPreviousStandupDate = (
  baseDate: Date,
  skipWeekends: boolean
): Date => {
  const previous = new Date(baseDate);
  previous.setDate(previous.getDate() - 1);

  if (!skipWeekends) {
    return previous;
  }

  while (previous.getDay() === 0 || previous.getDay() === 6) {
    previous.setDate(previous.getDate() - 1);
  }

  return previous;
};
