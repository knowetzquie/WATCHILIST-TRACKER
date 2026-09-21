import { Component, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api.js";
import LogEntryModal from "./LogEntryModal.jsx";
import EpisodeTrackerModal from "./EpisodeTrackerModal.jsx";

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} minute${min !== 1 ? "s" : ""} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? "s" : ""} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day !== 1 ? "s" : ""} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week !== 1 ? "s" : ""} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month !== 1 ? "s" : ""} ago`;
  const year = Math.floor(day / 365);
  return `${year} year${year !== 1 ? "s" : ""} ago`;
}

function ReviewCard({ item, onOpenDetails, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  const reviewDate = item.watched_at || item.created_at;
  const isLong = item.review.length > 220;

  return (
    <article className="review-card">
      <button
        className="review-card__poster-btn"
        onClick={() => onOpenDetails(item)}
        aria-label={`View details for ${item.title}`}
      >
        {item.poster_url && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="review-card__poster review-card__poster--skeleton" />
            )}
            <img
              src={item.poster_url}
              alt=""
              className="review-card__poster"
              style={{ display: imgLoaded ? "block" : "none" }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="review-card__poster review-card__poster--empty">
            🎬
          </div>
        )}
      </button>

      <div className="review-card__body">
        <div className="review-card__header">
          <h3 className="review-card__title">{item.title}</h3>
          {reviewDate && (
            <span className="review-card__time">
              {item.liked && <span className="review-card__liked">❤️</span>}
              Reviewed {relativeTime(reviewDate)}
            </span>
          )}
        </div>

        <div className="review-card__rating">
          {"★".repeat(item.rating)}
          <span className="review-card__rating-empty">
            {"★".repeat(5 - item.rating)}
          </span>
        </div>

        {item.genre && <p className="review-card__genre">{item.genre}</p>}

        <blockquote
          className={`review-card__text ${
            expanded ? "" : "review-card__text--clamped"
          }`}
        >
          “{item.review}”
        </blockquote>
        {isLong && (
          <button
            type="button"
            className="review-card__toggle"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        <div className="review-card__actions">
          <button
            type="button"
            className="review-card__action"
            title="Edit review"
            onClick={() => setShowLogModal(true)}
          >
            ✏️
          </button>
          <button
            type="button"
            className={`review-card__action ${
              item.liked ? "review-card__action--active" : ""
            }`}
            title="Like"
            onClick={() => onUpdate(item.id, { liked: !item.liked })}
          >
            {item.liked ? "❤️" : "🤍"}
          </button>
          {confirmingDelete ? (
            <span className="review-card__confirm">
              Delete?
              <button
                type="button"
                className="btn btn--tiny btn--danger"
                onClick={() => onDelete(item.id)}
              >
                Yes
              </button>
              <button
                type="button"
                className="btn btn--tiny btn--ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="review-card__action"
              title="Delete"
              onClick={() => setConfirmingDelete(true)}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {showLogModal && (
        <LogEntryModal
          item={item}
          onClose={() => setShowLogModal(false)}
          onSave={async (changes) => {
            await onUpdate(item.id, changes);
          }}
          onDelete={() => {
            onDelete(item.id);
          }}
        />
      )}
    </article>
  );
}

class ModalBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return createPortal(
        <div className="modal-overlay" onClick={this.props.onClose}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <p className="banner banner--error">
              Episode editor crashed: {String(this.state.error?.message)}
            </p>
            <button
              type="button"
              className="btn btn--ghost btn--tiny"
              onClick={this.props.onClose}
            >
              Close
            </button>
          </div>
        </div>,
        document.body,
      );
    }
    return this.props.children;
  }
}

const hasGenre = (genreStr, filter) =>
  filter === "all" ||
  (genreStr || "")
    .split(",")
    .map((g) => g.trim().toLowerCase())
    .includes(filter.toLowerCase());

function Stars({ value }) {
  const n = Math.max(0, Math.min(5, Math.round(value || 0)));
  return (
    <>
      {"★".repeat(n)}
      <span className="review-card__rating-empty">{"★".repeat(5 - n)}</span>
    </>
  );
}

function EpisodeReviewText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 160;
  return (
    <>
      <p
        className={`season-episodes__text ${
          isLong && !expanded ? "season-episodes__text--clamped" : ""
        }`}
      >
        “{text}”
      </p>
      {isLong && (
        <button
          type="button"
          className="review-card__toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}

function SeasonReviewCard({ group, item, onOpenDetails, onChanged }) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showTracker, setShowTracker] = useState(false);
  const { logs } = group;

  const deleteSeason = async () => {
    await Promise.all(
      logs.map((l) =>
        api.deleteEpisodeLog(l.item_id, l.season_number, l.episode_number),
      ),
    );
    setConfirmingDelete(false);
    onChanged();
  };

  const toggleLike = async (log) => {
    await api.logEpisode(log.item_id, log.season_number, log.episode_number, {
      rating: log.rating,
      review: log.review,
      liked: !log.liked,
      watched_at: log.watched_at || "",
    });
    onChanged();
  };

  const deleteEpisode = async (log) => {
    if (!window.confirm(`Delete your review of E${log.episode_number}?`))
      return;
    await api.deleteEpisodeLog(
      log.item_id,
      log.season_number,
      log.episode_number,
    );
    onChanged();
  };

  return (
    <article className="review-card">
      <button
        className="review-card__poster-btn"
        onClick={() => item && onOpenDetails(item)}
        aria-label={`View details for ${group.title}`}
      >
        {group.poster_url ? (
          <img src={group.poster_url} alt="" className="review-card__poster" />
        ) : (
          <div className="review-card__poster review-card__poster--empty">
            🎬
          </div>
        )}
      </button>

      <div className="review-card__body">
        <div className="review-card__header">
          <h3 className="review-card__title">
            {group.title} · Season {group.season_number}
          </h3>
          <span className="review-card__time">
            Reviewed {relativeTime(group.date)}
          </span>
        </div>

        <div className="review-card__rating">
          <Stars value={group.avg} />
          <span className="season-meta">
            {logs.length} episode review{logs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {group.genre && <p className="review-card__genre">{group.genre}</p>}

        <button
          type="button"
          className="review-card__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Hide episodes ▴" : "Show episodes ▾"}
        </button>

        {open && (
          <ul className="season-episodes">
            {logs.map((log) => (
              <li key={log.id} className="season-episodes__row">
                <div className="season-episodes__head">
                  <span className="season-episodes__ep">
                    E{log.episode_number}
                  </span>
                  <span className="review-card__rating">
                    <Stars value={log.rating} />
                  </span>
                  <span className="season-episodes__actions">
                    <button
                      type="button"
                      className={`review-card__action ${
                        log.liked ? "review-card__action--active" : ""
                      }`}
                      title="Like"
                      onClick={() => toggleLike(log)}
                    >
                      {log.liked ? "❤️" : "🤍"}
                    </button>
                    <button
                      type="button"
                      className="review-card__action"
                      title="Delete episode review"
                      onClick={() => deleteEpisode(log)}
                    >
                      🗑️
                    </button>
                  </span>
                </div>
                {log.review && <EpisodeReviewText text={log.review} />}
              </li>
            ))}
          </ul>
        )}

        <div className="review-card__actions">
          <button
            type="button"
            className="review-card__action"
            title="Edit episode reviews"
            onClick={() => setShowTracker(true)}
          >
            ✏️
          </button>
          {confirmingDelete ? (
            <span className="review-card__confirm">
              Delete season reviews?
              <button
                type="button"
                className="btn btn--tiny btn--danger"
                onClick={deleteSeason}
              >
                Yes
              </button>
              <button
                type="button"
                className="btn btn--tiny btn--ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="review-card__action"
              title="Delete season reviews"
              onClick={() => setConfirmingDelete(true)}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {showTracker &&
        item &&
        createPortal(
          <ModalBoundary
            onClose={() => {
              setShowTracker(false);
              onChanged();
            }}
          >
            <EpisodeTrackerModal
              item={item}
              onClose={() => {
                setShowTracker(false);
                onChanged();
              }}
            />
          </ModalBoundary>,
          document.body,
        )}
    </article>
  );
}

export default function ReviewsPage({
  items,
  onOpenDetails,
  onUpdate,
  onDelete,
}) {
  const [sortBy, setSortBy] = useState("recent");
  const [genreFilter, setGenreFilter] = useState("all");
  const [episodeLogs, setEpisodeLogs] = useState([]);

  const loadEpisodeLogs = () =>
    api
      .getEpisodeReviews()
      .then(setEpisodeLogs)
      .catch(() => {});

  useEffect(() => {
    loadEpisodeLogs();
  }, []);

  const reviewed = items.filter((it) => it.status === "completed" && it.review);

  const genres = useMemo(() => {
    const set = new Set();
    [...reviewed, ...episodeLogs].forEach((it) => {
      (it.genre || "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
        .forEach((g) => set.add(g));
    });
    return [...set].sort();
  }, [reviewed, episodeLogs]);

  const seasonGroups = useMemo(() => {
    const map = new Map();
    episodeLogs
      .filter((log) => hasGenre(log.genre, genreFilter))
      .forEach((log) => {
        const key = `${log.item_id}-${log.season_number}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            item_id: log.item_id,
            season_number: log.season_number,
            title: log.title,
            poster_url: log.poster_url,
            genre: log.genre,
            logs: [],
          });
        }
        map.get(key).logs.push(log);
      });

    return [...map.values()].map((g) => {
      g.logs.sort((a, b) => a.episode_number - b.episode_number);
      const rated = g.logs.filter((l) => l.rating > 0);
      g.avg = rated.length
        ? rated.reduce((sum, l) => sum + l.rating, 0) / rated.length
        : 0;
      g.date = new Date(
        Math.max(...g.logs.map((l) => new Date(l.watched_at || l.created_at))),
      );
      return g;
    });
  }, [episodeLogs, genreFilter]);

  const visible = reviewed
    .filter((it) => hasGenre(it.genre, genreFilter))
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      const aDate = new Date(a.watched_at || a.created_at);
      const bDate = new Date(b.watched_at || b.created_at);
      return bDate - aDate;
    });

  if (reviewed.length === 0 && episodeLogs.length === 0) {
    return (
      <div className="empty-state">
        <p>No reviews yet. Write one from any completed title.</p>
      </div>
    );
  }

  const total = visible.length + seasonGroups.length;

  return (
    <div className="reviews-page">
      <div className="reviews-toolbar">
        <label className="reviews-toolbar__field">
          <span>Sort by</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Recently watched</option>
            <option value="rating">Rating (high to low)</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </label>

        {genres.length > 0 && (
          <label className="reviews-toolbar__field">
            <span>Genre</span>
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
            >
              <option value="all">All genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        )}

        <span className="reviews-toolbar__count">
          {total} review{total !== 1 ? "s" : ""}
        </span>
      </div>

      {[
        ...visible.map((item) => ({
          date: new Date(item.watched_at || item.created_at),
          node: (
            <ReviewCard
              key={`item-${item.id}`}
              item={item}
              onOpenDetails={onOpenDetails}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ),
        })),
        ...seasonGroups.map((g) => ({
          date: g.date,
          node: (
            <SeasonReviewCard
              key={`season-${g.key}`}
              group={g}
              item={items.find((it) => it.id === g.item_id)}
              onOpenDetails={onOpenDetails}
              onChanged={loadEpisodeLogs}
            />
          ),
        })),
      ]
        .sort((a, b) => b.date - a.date)
        .map((entry) => entry.node)}
    </div>
  );
}
