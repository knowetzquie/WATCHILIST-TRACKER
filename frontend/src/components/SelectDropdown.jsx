import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Generic custom select.
 * options: [{ value: "plan to watch", label: "Plan to Watch" }, ...]
 */
export default function SelectDropdown({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const selected = options[selectedIndex];

  const close = () => setOpen(false);

  const openMenu = () => {
    const r = triggerRef.current.getBoundingClientRect();
    const menuHeight = options.length * 38 + 20;
    const flipUp =
      window.innerHeight - r.bottom < menuHeight && r.top > menuHeight;
    setPos(
      flipUp
        ? {
            bottom: window.innerHeight - r.top + 6,
            left: r.left,
            width: r.width,
            up: true,
          }
        : { top: r.bottom + 6, left: r.left, width: r.width, up: false },
    );
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (i) => {
    onChange(options[i].value);
    close();
    triggerRef.current?.focus();
  };

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
        setActive((i) => Math.min(i + 1, options.length - 1));
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

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`select-dd__trigger ${open ? "select-dd__trigger--open" : ""} ${className}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
      >
        <span className="select-dd__value">{selected?.label}</span>
        <svg
          className="select-dd__chevron"
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
              minWidth: Math.max(pos.width, 140),
            }}
          >
            {options.map((o, i) => (
              <li
                key={String(o.value)}
                role="option"
                aria-selected={o.value === value}
                className={`rank-dd__option ${
                  i === active ? "rank-dd__option--active" : ""
                } ${o.value === value ? "rank-dd__option--selected" : ""}`}
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
          </ul>,
          document.body,
        )}
    </>
  );
}
