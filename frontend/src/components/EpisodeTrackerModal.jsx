import { useEffect, useState } from "react";
import { api } from "../api.js";

function EpisodeRow({ item, seasonNumber, episode, log, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating] = useState(log?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState(log?.review || "");
  const [watchedOn, setWatchedOn] = useState(
    log?.watched_at || new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);

  const watched = !!log;

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await api.logEpisode(
        item.id,
        seasonNumber,
        episode.episode_number,
        { rating, review: review.trim(), watched_at: watchedOn },
      );
      onSaved(episode.episode_number, saved);
      setExpanded(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnmark() {
    await api.deleteEpisodeLog(item.id, seasonNumber, episode.episode_number);
    onSaved(episode.episode_number, null);
  }

  return (
    <div className={`episode-row ${watched ? "episode-row--watched" : ""}`}>
      <button
        type="button"
        className="episode-row__toggle"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="episode-row__check">
          {watched ? "✓" : episode.episode_number}
        </span>
        <span className="episode-row__info">
          <span className="episode-row__title">
            E{episode.episode_number} · {episode.name}
          </span>
          {watched && (
            <span className="episode-row__meta">
              {"★".repeat(log.rating)}
              {log.rating > 0 ? ` (${log.rating}/5)` : ""}
              {log.watched_at ? ` · Watched ${log.watched_at}` : ""}
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="episode-row__editor">
          <label className="episode-row__field">
            <span>Watched on</span>
            <input
              type="date"
              value={watchedOn}
              onChange={(e) => setWatchedOn(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>

          <div className="episode-row__stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHoverRating(n)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(n === rating ? 0 : n)}
              >
                {(hoverRating || rating) >= n ? "★" : "☆"}
              </button>
            ))}
          </div>

          <textarea
            placeholder="Thoughts on this episode…"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
          />

          <div className="episode-row__actions">
            {watched && (
              <button
                type="button"
                className="btn btn--ghost btn--tiny"
                onClick={handleUnmark}
              >
                Unmark watched
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary btn--tiny"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EpisodeTrackerModal({ item, onClose }) {
  const [seasons, setSeasons] = useState([]);
  const [seasonNumber, setSeasonNumber] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!item.tmdb_id) {
      setError(
        "This show isn't linked to TMDB, so episode lists can't be fetched.",
      );
      setLoading(false);
      return;
    }
    Promise.all([api.getTvSeasons(item.tmdb_id), api.getEpisodeLogs(item.id)])
      .then(([seasonData, logRows]) => {
        if (cancelled) return;
        setSeasons(seasonData.seasons || []);
        const logMap = {};
        logRows.forEach((l) => {
          logMap[`${l.season_number}-${l.episode_number}`] = l;
        });
        setLogs(logMap);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [item.tmdb_id, item.id]);

  useEffect(() => {
    if (!item.tmdb_id) return;
    let cancelled = false;
    setLoading(true);
    api
      .getSeasonEpisodes(item.tmdb_id, seasonNumber)
      .then((data) => {
        if (!cancelled) setEpisodes(data.episodes || []);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [item.tmdb_id, seasonNumber]);

  function handleSaved(episodeNumber, log) {
    setLogs((current) => {
      const key = `${seasonNumber}-${episodeNumber}`;
      const next = { ...current };
      if (log) next[key] = log;
      else delete next[key];
      return next;
    });
  }

  const watchedCount = episodes.filter(
    (e) => logs[`${seasonNumber}-${e.episode_number}`],
  ).length;
  const seasonRatings = episodes
    .map((e) => logs[`${seasonNumber}-${e.episode_number}`]?.rating)
    .filter((r) => r > 0);
  const seasonAvg = seasonRatings.length
    ? (seasonRatings.reduce((a, b) => a + b, 0) / seasonRatings.length).toFixed(
        1,
      )
    : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--episodes"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="episode-tracker__title">{item.title} — Episodes</h2>

        {error && <p className="banner banner--error">{error}</p>}

        {seasons.length > 0 && (
          <div className="episode-tracker__season-select">
            <label>
              <span>Season</span>
              <select
                value={seasonNumber}
                onChange={(e) => setSeasonNumber(Number(e.target.value))}
              >
                {seasons.map((s) => (
                  <option key={s.season_number} value={s.season_number}>
                    {s.name} ({s.episode_count} episodes)
                  </option>
                ))}
              </select>
            </label>
            <span className="episode-tracker__summary">
              {watchedCount}/{episodes.length} watched
              {seasonAvg ? ` · avg ${seasonAvg}★` : ""}
            </span>
          </div>
        )}

        {loading ? (
          <p className="stats-empty">Loading episodes…</p>
        ) : (
          <div className="episode-tracker__list">
            {episodes.map((ep) => (
              <EpisodeRow
                key={ep.episode_number}
                item={item}
                seasonNumber={seasonNumber}
                episode={ep}
                log={logs[`${seasonNumber}-${ep.episode_number}`]}
                onSaved={handleSaved}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
