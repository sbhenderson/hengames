import { DEFAULT_AVATAR_CHOICES, type ParticipantAvatar } from "@hengames/shared";

export function AvatarPicker(props: {
  value: ParticipantAvatar;
  onChange(avatar: ParticipantAvatar): void;
  disabled?: boolean;
}) {
  return (
    <details className="avatar-dropdown">
      <summary
        aria-disabled={props.disabled}
        className="avatar-summary"
        onClick={(event) => {
          if (props.disabled) {
            event.preventDefault();
          }
        }}
      >
        <span className="avatar small" style={{ background: props.value.color }}>{props.value.emoji}</span>
        <span>Change icon</span>
      </summary>
      <div className="avatar-menu">
        <div className="avatar-grid" role="group" aria-label="Choose avatar icon">
          {DEFAULT_AVATAR_CHOICES.map((avatar) => {
            const selected = avatar.emoji === props.value.emoji && avatar.color === props.value.color;
            return (
              <button
                aria-label={`Use ${avatar.emoji} avatar`}
                aria-pressed={selected}
                className={`avatar-choice${selected ? " selected" : ""}`}
                disabled={props.disabled}
                key={`${avatar.emoji}-${avatar.color}`}
                onClick={(event) => {
                  props.onChange(avatar);
                  event.currentTarget.closest("details")?.removeAttribute("open");
                }}
                style={{ background: avatar.color }}
                type="button"
              >
                {avatar.emoji}
              </button>
            );
          })}
        </div>
      </div>
    </details>
  );
}
