export function SuggestionChips({ items, onPick }) {
  return (
    <div className="suggestion-row">
      {items.map((item) => (
        <button type="button" key={item} className="suggestion-chip" onClick={() => onPick(item)}>
          {item}
        </button>
      ))}
    </div>
  );
}
