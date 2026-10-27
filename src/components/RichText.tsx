import { Fragment } from "react";
import { parseRich } from "@/lib/richText";

/** Shows text with **bold** and __underline__ applied. Renders React elements only, never raw HTML. */
export default function RichText({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((p, i) => {
        let node: React.ReactNode = p.text;
        if (p.underline) node = <u>{node}</u>;
        if (p.bold) node = <strong>{node}</strong>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}
