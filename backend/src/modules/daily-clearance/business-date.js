export function businessDateFor(instant = new Date(), timeZone = 'Asia/Kolkata') {
  if (!(instant instanceof Date) || Number.isNaN(instant.valueOf()))
    throw new Error('Invalid instant');
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(instant);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  } catch {
    throw Object.assign(new Error('Farm timezone is invalid'), { code: 'INVALID_FARM_TIMEZONE' });
  }
}

export function businessDateValue(dateText) {
  return new Date(`${dateText}T00:00:00.000Z`);
}
