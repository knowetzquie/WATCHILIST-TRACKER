import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const OPTIONS = [
  { value: null, label: "☆ No rank" },
  { value: 1, label: "★ #1" },
  { value: 2, label: "★ #2" },
  { value: 3, label: "★ #3" },
  { value: 4, label: "★ #4" },
  { value: 5, label: "★ #5" },
];

export default function RankDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listId = useId();

  const current = value || null;
  const selectedIndex = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === current),
  );

  const openMenu = () => {
    const r = triggerRef.current.getBoundingClientRect();
    const menuHeight = 250;
    const flipUp =
      window.innerHeight - r.bottom < menuHeight && r.top > menuHeight;
    setPos(
      flipUp
        ? { bottom: window.innerHeight - r.top + 6, left: r.left, width: r.width, up: true }
        : { top: r.bottom + 6, left: r.left, width: r.width, up: false },
    );
    setActive(selectedIndex);
    setOpen(true);
  };

  const close = () => setOpen(false);

  const choose = (i) => {
    onChange(OPTIONS[i].value);
    close();
    triggerRef.current?.focus();
  };

  // close on outside click, scroll, resize
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        close();
      }
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

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
        setActive((i) => Math.min(i + 1, OPTIONS.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
      case "Tab":
        close();
        break;
      default:
    }
  };

  const triggerLabel = current ? `★ #${current}` : "☆ Top 5";

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`favorite-select rank-dd__trigger ${
          current ? "favorite-select--active" : ""
        }`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title="Top 5 of All Time"
      >
        {triggerLabel}
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            id={listId}
            ref={menuRef}
            role="listbox"
            className={`rank-dd__menu ${pos.up ? "rank-dd__menu--up" : ""}`}
            style={{
              position: "fixed",
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              minWidth: Math.max(pos.width, 120),
            }}
          >
            {OPTIONS.map((o, i) => (
              <li
                key={String(o.value)}
                role="option"
                aria-selected={o.value === current}
                className={`rank-dd__option ${
                  i === active ? "rank-dd__option--active" : ""
                } ${o.value === current ? "rank-dd__option--selected" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                <span>{o.label}</span>
                {o.value === current && (
                  <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
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
          </ul>,
          document.body,
        )}
    </>
  );
}