import { describe, expect, it } from "vitest";
import { csvToChunks, parseCsv } from "@/src/lib/bot/csv";

describe("csv knowledge", () => {
  it("handles quotes, commas and blank lines", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });
  it("turns each row into a chunk", () => {
    const c = csvToChunks("offers.csv", "Topic,Answer,Note\nWarranty,One year on engines,\nHours,Sun to Fri 9-6,Closed Saturday");
    expect(c).toHaveLength(2);
    expect(c[0]).toMatchObject({ title: "Warranty", text: "Topic: Warranty\nAnswer: One year on engines" });
    expect(c[1].text).toContain("Note: Closed Saturday");
  });
});