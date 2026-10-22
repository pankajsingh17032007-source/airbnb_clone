export function validDateRange(start, end) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return Number.isFinite(startTime) && Number.isFinite(endTime) && startTime < endTime;
}

export function bookingNights(start, end) {
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

export function bookingTotal(price, start, end, unit = "night", guests = 1) {
  return Number(price) * (unit === "night" ? bookingNights(start, end) : Number(guests));
}

export function dateRangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return new Date(firstStart) < new Date(secondEnd) && new Date(firstEnd) > new Date(secondStart);
}

export function unitMatchesRequest(unit, startDate, endDate, guests) {
  return unit.maxGuests >= Number(guests)
    && (!startDate || new Date(unit.availableFrom) <= new Date(startDate))
    && (!endDate || new Date(unit.availableUntil) >= new Date(endDate));
}