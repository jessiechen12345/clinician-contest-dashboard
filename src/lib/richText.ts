export interface RichPart {
  text: string;
  bold: boolean;
  underline: boolean;
}

/**
 * Tiny, safe formatting for text an admin types: **bold**, __underline__, and both together (**__like this__**).
 * It never produces HTML, so nothing typed here can inject markup. A marker with no partner stays as plain text.
 */
export function parseRich(input: string): RichPart[] {
  const tokens = input.split(/(\*\*|__)/); // text, marker, text, marker, ...
  const paired = new Set<number>();
  for (const marker of ["**", "__"]) {
    const at: number[] = [];
    tokens.forEach((t, i) => { if (t === marker) at.push(i); });
    for (let k = 0; k + 1 < at.length; k += 2) { paired.add(at[k]); paired.add(at[k + 1]); }
  }
  const out: RichPart[] = [];
  let bold = false;
  let underline = false;
  const push = (text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.bold === bold && last.underline === underline) last.text += text;
    else out.push({ text, bold, underline });
  };
  tokens.forEach((t, i) => {
    if ((t === "**" || t === "__") && paired.has(i)) {
      if (t === "**") bold = !bold;
      else underline = !underline;
    } else push(t);
  });
  return out;
}
