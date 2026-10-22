import assert from "node:assert/strict";
import test from "node:test";
import { bookingNights, bookingTotal, dateRangesOverlap, unitMatchesRequest, validDateRange } from "../booking-rules.js";

test("accepts a valid stay and rejects invalid date ranges", () => {
  assert.equal(validDateRange("2027-06-10", "2027-06-13"), true);
  assert.equal(validDateRange("2027-06-10", "2027-06-10"), false);
  assert.equal(validDateRange("2027-06-13", "2027-06-10"), false);
  assert.equal(validDateRange("not-a-date", "2027-06-13"), false);
});

test("calculates nights across month boundaries and prices each night", () => {
  assert.equal(bookingNights("2027-06-30", "2027-07-02"), 2);
  assert.equal(bookingTotal(184, "2027-06-30", "2027-07-02"), 368);
  assert.equal(bookingTotal(58, "2027-06-30", "2027-07-02", "person"), 58);
  assert.equal(bookingTotal(58, "2027-06-30", "2027-07-02", "person", 3), 174);
});

test("matches inventory units by capacity and complete availability window", () => {
  const room = { maxGuests: 3, availableFrom: "2027-01-01", availableUntil: "2027-12-31" };
  assert.equal(unitMatchesRequest(room, "2027-06-10", "2027-06-13", 3), true);
  assert.equal(unitMatchesRequest(room, "2027-06-10", "2027-06-13", 4), false);
  assert.equal(unitMatchesRequest(room, "2026-12-30", "2027-01-03", 2), false);
  assert.equal(unitMatchesRequest(room, "2027-12-30", "2028-01-02", 2), false);
});

test("treats checkout/check-in boundaries as non-overlapping", () => {
  assert.equal(dateRangesOverlap("2027-06-10", "2027-06-12", "2027-06-12", "2027-06-14"), false);
  assert.equal(dateRangesOverlap("2027-06-10", "2027-06-13", "2027-06-12", "2027-06-14"), true);
});