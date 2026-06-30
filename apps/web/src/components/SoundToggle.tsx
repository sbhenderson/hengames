import { useFeedback } from "../feedback/feedback";

export function SoundToggle() {
  const { enabled, toggle } = useFeedback();
  return (
    <button
      type="button"
      className={enabled ? "sound-toggle is-on" : "sound-toggle"}
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Sound and haptics on" : "Sound and haptics off"}
      title={enabled ? "Sound on" : "Sound off"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4 9v6h4l5 4V5L8 9H4Z"
          fill="currentColor"
        />
        {enabled ? (
          <>
            <path d="M16 8.5c1.4 1 1.4 6 0 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M18.5 6c2.6 1.8 2.6 10 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : (
          <path d="M16 9l5 6m0-6l-5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
