import { useEffect, useId, useRef, useState } from "react";

export default function GenreDropdown({ value, onChange, genres }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const options = [
    { value: "all", label: "All genres" },
    ...genres.map((g) => ({ value: g, label: g })),
  ];
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  // close when clicking / tapping outside
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // keep highlighted option visible
  useEffect(() => {
    if (open) {
      listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, active]);

  const openMenu = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (i) => {
    onChange(options[i].value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
      case "Tab":
        setOpen(false);
        break;
      default:
    }
  };

  return (
    <div
      className={`genre-dd ${open ? "genre-dd--open" : ""} ${
        value !== "all" ? "genre-dd--filtered" : ""
      }`}
      ref={rootRef}
    >
      <button
        type="button"
        className="genre-dd__trigger"
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Filter by genre"
      >
        <span className="genre-dd__value">{selected.label}</span>
        <svg
          className="genre-dd__chevron"
          width="14"
          height="14"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            d="M5 7.5l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <ul
        id={listId}
        className="genre-dd__menu"
        role="listbox"
        ref={listRef}
        aria-label="Genres"
      >
        {options.map((o, i) => (
          <li
            key={o.value}
            role="option"
            aria-selected={o.value === value}
            className={`genre-dd__option ${
              i === active ? "genre-dd__option--active" : ""
            } ${o.value === value ? "genre-dd__option--selected" : ""}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(i)}
          >
            <span>{o.label}</span>
            {o.value === value && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  d="M4 10.5l4 4 8-9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
