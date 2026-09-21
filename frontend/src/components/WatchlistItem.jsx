import { useState } from "react";
import StarRating from "./StarRating.jsx";
import LogEntryModal from "./LogEntryModal.jsx";
import EpisodeTrackerModal from "./EpisodeTrackerModal.jsx";
import RankDropdown from "./RankDropdown.jsx";

export default function WatchlistItem({
  item,
  onUpdate,
  onDelete,
  onOpenDetails,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showEpisodeTracker, setShowEpisodeTracker] = useState(false);
  const watchedLabel = item.watched_at
    ? `Watched ${new Date(item.watched_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })}`
    : "Not watched yet";

  return (
    <li className={`ticket ticket--${item.status.replace(/\s+/g, "-")}`}>
      <div className="ticket__clip">
        <div className="ticket__stub" aria-hidden="true" />

        <div className="ticket__inner">
          <div className="ticket__body">
            <div className="ticket__main">
              <button
                className="ticket__poster-btn"
                onClick={() => onOpenDetails(item)}
                aria-label={`View details for ${item.title}`}
                title="View details"
              >
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt=""
                    className="ticket__poster"
                  />
                ) : (
                  <div className="ticket__poster ticket__poster--empty">🎬</div>
                )}
              </button>
              <div className="ticket__text">
                <p className="ticket__title" title={item.title}>
                  {item.title}
                </p>
                {item.genre && (
                  <p className="ticket__genre" title={item.genre}>
                    {item.genre}
                  </p>
                )}
                <div className="ticket__meta" aria-label={watchedLabel}>
                  {item.liked && <span title="Liked">♥</span>}
                  <span>{watchedLabel}</span>
                </div>
                <div className="ticket__actions">
                  <button
                    className="btn btn--tiny ticket__log-btn"
                    onClick={() => setShowLogModal(true)}
                    title="Open diary entry"
                  >
                    ✎ Log
                  </button>
                  {item.media_type === "tv" && (
                    <button
                      className="btn btn--tiny ticket__log-btn"
                      onClick={() => setShowEpisodeTracker(true)}
                      title="Track episodes"
                    >
                      📺 Episodes
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="ticket__controls">
              <RankDropdown
                value={item.favorite_rank}
                onChange={(rank) => onUpdate(item.id, { favorite_rank: rank })}
              />

              <div className="ticket__status-badge">
                {item.status === "plan to watch"
                  ? "Plan to Watch"
                  : item.status === "watching"
                    ? "Watching"
                    : "Completed"}
              </div>

              <StarRating
                value={item.rating}
                readOnly={true}
                onChange={() => {}}
              />

              {confirmingDelete ? (
                <span className="confirm-delete">
                  Remove?
                  <button
                    className="btn btn--tiny btn--danger"
                    onClick={() => onDelete(item.id)}
                  >
                    Yes
                  </button>
                  <button
                    className="btn btn--tiny btn--ghost"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  className="icon-btn"
                  title="Remove from list"
                  aria-label="Remove from list"
                  onClick={() => setConfirmingDelete(true)}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
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
      {showEpisodeTracker && (
        <EpisodeTrackerModal
          item={item}
          onClose={() => setShowEpisodeTracker(false)}
        />
      )}
    </li>
  );
}
