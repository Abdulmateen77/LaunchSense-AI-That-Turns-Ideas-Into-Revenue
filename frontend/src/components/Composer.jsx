import { useEffect, useRef, useState } from "react";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5l7 7-7 7M19 12H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Composer({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  function submit(event) {
    event.preventDefault();
    onSend(value);
    setValue("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(event);
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer__box">
        <button type="button" className="composer__icon-button" aria-label="Add attachment">
          <PlusIcon />
        </button>

        <label className="composer__field">
          <span className="sr-only">Message</span>
          <textarea
            ref={textareaRef}
            rows="1"
            value={value}
            placeholder="Send a message..."
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
        </label>

        <button
          type="submit"
          className="composer__send-button"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          <ArrowIcon />
        </button>
      </div>

      <div className="composer__footer">
        <button type="button" className="composer-pill">
          GPT 4.1
        </button>
        <button type="button" className="composer-pill">
          Private
        </button>
      </div>
    </form>
  );
}
