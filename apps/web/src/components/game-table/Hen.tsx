export function Hen(props: { size?: number; title?: string; tone?: "amber" | "cream" | "ink" }) {
  const size = props.size ?? 24;
  const tone = props.tone ?? "amber";
  const body = tone === "cream" ? "#f6ead2" : tone === "ink" ? "#2b2622" : "#eaa63f";
  const bodyShade = tone === "cream" ? "#e4d3ac" : tone === "ink" ? "#1c1814" : "#cf8a2c";
  const comb = tone === "ink" ? "#2b2622" : "#c14a3d";
  const beak = tone === "ink" ? "#2b2622" : "#e07b2c";
  const eye = tone === "cream" ? "#2b2622" : tone === "ink" ? "#f6ead2" : "#2b2622";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={props.title ?? "hen"}
      aria-hidden={props.title ? undefined : true}
      focusable="false"
    >
      {props.title ? <title>{props.title}</title> : null}
      {/* tail feathers */}
      <path d="M12 22 L3 18 L9 25 L2 27 L10 30 Z" fill={bodyShade} />
      {/* comb */}
      <circle cx="27" cy="12" r="2.4" fill={comb} />
      <circle cx="31" cy="10.5" r="2.6" fill={comb} />
      <circle cx="35" cy="12" r="2.3" fill={comb} />
      {/* body + head */}
      <path d="M9 31c0-9 7-15 16-15 9 0 15 6 15 14 0 7-6 11-15 11S9 38 9 31Z" fill={body} />
      {/* wing */}
      <path d="M19 28c5-2 10-1 13 3-3 4-9 5-13 2-1-2-1-4 0-5Z" fill={bodyShade} />
      {/* beak */}
      <path d="M39 24 L46 26 L39 29 Z" fill={beak} />
      {/* wattle */}
      <path d="M39 29c2 0 3 2 1 4-2 1-3-1-3-3Z" fill={comb} />
      {/* eye */}
      <circle cx="32" cy="23" r="1.5" fill={eye} />
      {/* legs */}
      <path d="M21 40 L21 45 M27 40 L27 45" stroke={beak} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
