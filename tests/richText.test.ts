import { describe, expect, it } from "vitest";
import { parseRich } from "../src/lib/richText";

const P = (b: boolean, u: boolean, text: string) => ({ bold: b, underline: u, text });

describe("bold and underline in prize text", () => {
  it("leaves plain text alone", () => expect(parseRich("A Google Pixel phone")).toEqual([P(false, false, "A Google Pixel phone")]));
  it("bolds **words**", () => expect(parseRich("Win a **Google Pixel** today")).toEqual([P(false, false, "Win a "), P(true, false, "Google Pixel"), P(false, false, " today")]));
  it("underlines __words__", () => expect(parseRich("per __province__")).toEqual([P(false, false, "per "), P(false, true, "province")]));
  it("does both at once", () => {
    expect(parseRich("**__$100__** card")).toEqual([P(true, true, "$100"), P(false, false, " card")]);
    expect(parseRich("__**$100**__ card")).toEqual([P(true, true, "$100"), P(false, false, " card")]);
  });
  it("handles several formatted words in one line", () => {
    expect(parseRich("**One** lucky winner per __province__").map((p) => [p.text, p.bold, p.underline])).toEqual([
      ["One", true, false], [" lucky winner per ", false, false], ["province", false, true]
    ]);
  });
  it("keeps a marker with no partner as plain text", () => {
    expect(parseRich("Cost is 5** or less")).toEqual([P(false, false, "Cost is 5** or less")]);
    expect(parseRich("snake__case")).toEqual([P(false, false, "snake__case")]);
    expect(parseRich("___")).toEqual([P(false, false, "___")]);
  });
  it("never turns typed HTML into markup (it stays as text)", () => {
    const parts = parseRich('**<script>alert(1)</script>** <b>x</b>');
    expect(parts.map((p) => p.text).join("")).toBe("<script>alert(1)</script> <b>x</b>");
  });
  it("works with French text and symbols", () => {
    expect(parseRich("Un·e **gagnant·e** de 100 $ !")).toEqual([P(false, false, "Un·e "), P(true, false, "gagnant·e"), P(false, false, " de 100 $ !")]);
  });
  it("copes with empty input and empty markers", () => {
    expect(parseRich("")).toEqual([]);
    expect(parseRich("a****b").map((p) => p.text).join("")).toBe("ab");
  });
});
