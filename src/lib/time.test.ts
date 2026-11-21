import { describe, expect, it } from "vitest";
import { dayLabel, dayOfTimestamp, firstName, greetingFor, relativeTime } from "./time";

const NOW = Date.parse("2026-11-20T10:00:00Z");

describe("relativeTime", () => {
  it.each([
    ["2026-11-20T09:59:50Z", "just now"],
    ["2026-11-20T09:55:00Z", "5 min ago"],
    ["2026-11-20T07:00:00Z", "3 h ago"],
    ["2026-11-19T09:00:00Z", "Yesterday"],
    ["2026-11-16T10:00:00Z", "4 days ago"],
    ["2026-10-02T10:00:00Z", "2 Oct"],
  ])("%s reads as %s", (iso, expected) => {
    expect(relativeTime(iso, NOW)).toBe(expected);
  });

  it("returns an empty string for an invalid timestamp", () => {
    expect(relativeTime("not a date", NOW)).toBe("");
  });
});

describe("dayLabel", () => {
  it("labels today, yesterday and older days", () => {
    expect(dayLabel("2026-11-20", "2026-11-20")).toBe("Today");
    expect(dayLabel("2026-11-19", "2026-11-20")).toBe("Yesterday");
    expect(dayLabel("2026-11-16", "2026-11-20")).toBe("Mon 16 Nov");
  });

  it("adds the year for a different year", () => {
    expect(dayLabel("2025-12-31", "2026-01-02")).toBe("31 Dec 2025");
  });
});

describe("dayOfTimestamp", () => {
  it("uses India time, so late-evening UTC lands on the next day", () => {
    expect(dayOfTimestamp("2026-11-19T20:00:00Z")).toBe("2026-11-20");
  });
});

describe("greetingFor and firstName", () => {
  it("greets by time of day", () => {
    expect(greetingFor(3)).toBe("Still up");
    expect(greetingFor(9)).toBe("Good morning");
    expect(greetingFor(14)).toBe("Good afternoon");
    expect(greetingFor(19)).toBe("Good evening");
    expect(greetingFor(22)).toBe("Good night");
  });

  it("takes the first word of a name", () => {
    expect(firstName("Akshat Mahajan")).toBe("Akshat");
    expect(firstName("  Yash ")).toBe("Yash");
  });
});
