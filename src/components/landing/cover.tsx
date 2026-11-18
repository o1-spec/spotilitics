export type CoverKind = "orange" | "blue" | "pink" | "green";
export const sessions = {
  orange: {
    title: "After hours",
    mood: "Warm tones. Late nights.",
    color: "#e6925f",
  },
  blue: {
    title: "Deep blue",
    mood: "A little space to drift.",
    color: "#9dbaca",
  },
  pink: {
    title: "Soft signal",
    mood: "A softer kind of energy.",
    color: "#dfa6bd",
  },
  green: {
    title: "In bloom",
    mood: "Something new taking shape.",
    color: "#c1fa69",
  },
};
export function Cover({
  kind,
  className = "",
}: {
  kind: CoverKind;
  className?: string;
}) {
  return (
    <div
      className={`cover cover-${kind} ${className}`}
      role="img"
      aria-label={`Original ${sessions[kind].title} artwork`}
    >
      <div className="cover-shape" />
      <div className="cover-caption">
        <span>{sessions[kind].title}</span>
        <small>SPOTLYTICS SESSIONS</small>
      </div>
    </div>
  );
}
