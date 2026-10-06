/** Refined B candidate. Aesthetic approval remains a human decision. */
export function ApplicationMark({ size = 32 }: { size?: number }) {
  const small = size <= 16;
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M8 24V8L24 24V8" stroke="currentColor" strokeWidth={small ? 3.5 : 3} strokeLinejoin="round" />
    <g fill="currentColor">
      <circle cx="8" cy="8" r={small ? 2.3 : 2.6} />
      <circle cx="8" cy="24" r={small ? 2.3 : 2.6} />
      <circle cx="24" cy="8" r={small ? 2.3 : 2.6} />
      <circle cx="24" cy="24" r={small ? 2.3 : 2.6} />
    </g>
  </svg>;
}
