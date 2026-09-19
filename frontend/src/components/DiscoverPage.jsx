import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

function LoadingRail({ title }) {
  return (
    <section
      className="feature-section discovery-loading-rail"
      aria-label={`Loading ${title}`}
    >
      <div className="feature-section__heading">
        <h2>{title}</h2>
        <span className="discovery-loading-label">Loading</span>
      </div>
      <div className="discovery-grid discovery-grid--scroll">
        {[1, 2, 3, 4, 5, 6].map((placeholder) => (
          <div className="discovery-skeleton" key={placeholder} />
        ))}
      </div>
    </section>
  );
}

function Feed({
  title,
  items,
  onAdd,
  watchlistKeys,
  headingExtra,
  compact = false,
  onLoadMore,
  loadingMore,
}) {
  if (!items.length)
    return <p className="empty-state">Nothing to show right now.</p>;
  return (
    <section className="feature-section">
      <div className="feature-section__heading">
        <div className="discovery-heading-title">
          <h2>{title}</h2>
          {headingExtra}
        </div>
        <span>{items.length} titles</span>
      </div>
      <div className="discovery-grid discovery-grid--scroll">
        {items.map((item) => {
          const key = `${item.media_type}-${item.tmdb_id}`;
          const added = watchlistKeys.has(key);
          return (
            <article
              className={`discovery-card ${compact ? "discovery-card--compact" : ""}`}
              key={key}
            >
              <div className="discovery-card__poster-wrap">
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt=""
                    className="discovery-card__poster-img"
                  />
                ) : (
                  <div className="discovery-card__poster discovery-card__poster--empty">
                    🎬
                  </div>
                )}
                <button
                  type="button"
                  className={`discovery-card__add ${added ? "discovery-card__add--added" : ""}`}
                  disabled={added}
                  onClick={() => onAdd(item)}
                  aria-label={
                    added ? "Already in watchlist" : "Add to watchlist"
                  }
                  title={added ? "Already in watchlist" : "Add to watchlist"}
                >
                  {added ? "✓" : "+"}
                </button>
                {item.vote_average > 0 && (
                  <span
                    className="discovery-card__score"
                    title="TMDB community rating"
                  >
                    ★ {item.vote_average.toFixed(1)}
                  </span>
                )}
                {item.year && (
                  <span className="discovery-card__year-pill">{item.year}</span>
                )}
              </div>
              <div className="discovery-card__body">
                <h3>{item.title}</h3>
                <p className="discovery-card__date">
                  {item.release_date
                    ? new Date(
                        `${item.release_date}T12:00:00`,
                      ).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : item.year || "Release date unknown"}
                </p>
                <span className="discovery-card__type">
                  {item.media_type === "tv" ? "TV show" : "Movie"}
                </span>
                {item.reason && (
                  <small className="discovery-card__reason">
                    {item.reason}
                  </small>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <button
        className="discovery-load-more"
        type="button"
        onClick={onLoadMore}
        disabled={loadingMore}
      >
        {loadingMore ? "Loading..." : "Load more"}
      </button>
    </section>
  );
}

export default function DiscoverPage({ items, onAdd }) {
  const [feeds, setFeeds] = useState({
    recommendations: [],
    trending: [],
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [releaseYear, setReleaseYear] = useState("all");
  const [trendingWindow, setTrendingWindow] = useState("week");
  const [pages, setPages] = useState({
    recommendations: 1,
    trending: 1,
    upcoming: 1,
  });
  const [loadingMore, setLoadingMore] = useState("");
  const watchlistKeys = useMemo(
    () =>
      new Set(
        items
          .filter((item) => item.tmdb_id)
          .map((item) => `${item.media_type || "movie"}-${item.tmdb_id}`),
      ),
    [items],
  );
  const topGenres = useMemo(() => {
    const counts = {};
    items.forEach((item) =>
      (item.genre || "").split(",").forEach((genre) => {
        const key = genre.trim();
        if (key) counts[key] = (counts[key] || 0) + (item.rating || 1);
      }),
    );
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)
      .join(",");
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    api.discover("recommendations", topGenres).then((data) => {
      if (!cancelled) {
        setFeeds((f) => ({ ...f, recommendations: data }));
        setPages((p) => ({ ...p, recommendations: 1 }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [topGenres]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.discover("trending", "", trendingWindow),
      api.discover("upcoming"),
    ])
      .then(([trending, upcoming]) => {
        if (!cancelled) {
          setFeeds((f) => ({ ...f, trending, upcoming }));
          setPages((p) => ({ ...p, trending: 1, upcoming: 1 }));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trendingWindow]);

  const years = useMemo(
    () =>
      [
        ...new Set(
          Object.values(feeds)
            .flat()
            .map((item) => item.year)
            .filter(Boolean),
        ),
      ].sort((a, b) => b - a),
    [feeds],
  );
  const filterItems = (feed) =>
    feed.filter(
      (item) =>
        (mediaType === "all" || item.media_type === mediaType) &&
        (releaseYear === "all" || item.year === releaseYear),
    );
  async function loadMore(section) {
    setLoadingMore(section);
    const nextPage = pages[section] + 1;
    try {
      const more = await api.discover(
        section,
        section === "recommendations" ? topGenres : "",
        trendingWindow,
        nextPage,
      );
      setFeeds((current) => ({
        ...current,
        [section]: [...current[section], ...more],
      }));
      setPages((current) => ({ ...current, [section]: nextPage }));
    } finally {
      setLoadingMore("");
    }
  }
  return (
    <div className="feature-page">
      <header className="feature-page__intro">
        <span className="feature-page__eyebrow">
          <span className="feature-page__eyebrow-dot" />
          Discover
        </span>
        <h1 className="feature-page__headline">
          Discover your <span>next favorite</span>
        </h1>
        <p className="feature-page__lede">
          Personalized picks shaped by your favorites and genre habits,
          alongside what's moving now.
        </p>
      </header>
      <div className="discovery-filters" aria-label="Recommendation filters">
        <span className="discovery-filters__label">Show</span>
        {[
          ["all", "Everything"],
          ["movie", "Movies"],
          ["tv", "TV shows"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mediaType === value ? "active" : ""}
            onClick={() => setMediaType(value)}
          >
            {label}
          </button>
        ))}
        <label>
          <span className="sr-only">Release year</span>
          <select
            value={releaseYear}
            onChange={(event) => setReleaseYear(event.target.value)}
          >
            <option value="all">Any year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="banner banner--error">{error}</p>}
      {loading && (
        <div className="discovery-loading-state" aria-live="polite">
          <LoadingRail title="Trending" />
          <LoadingRail title="Picked for you" />
        </div>
      )}
      {!loading && !error && (
        <>
          <Feed
            title="Trending"
            compact
            headingExtra={
              <div
                className="trending-toggle"
                role="group"
                aria-label="Trending period"
              >
                <button
                  className={trendingWindow === "day" ? "active" : ""}
                  onClick={() => setTrendingWindow("day")}
                  type="button"
                >
                  Today
                </button>
                <button
                  className={trendingWindow === "week" ? "active" : ""}
                  onClick={() => setTrendingWindow("week")}
                  type="button"
                >
                  This Week
                </button>
              </div>
            }
            items={filterItems(feeds.trending)}
            onAdd={onAdd}
            watchlistKeys={watchlistKeys}
            onLoadMore={() => loadMore("trending")}
            loadingMore={loadingMore === "trending"}
          />
          <Feed
            title="Picked for you"
            compact
            items={filterItems(feeds.recommendations)}
            onAdd={onAdd}
            watchlistKeys={watchlistKeys}
            onLoadMore={() => loadMore("recommendations")}
            loadingMore={loadingMore === "recommendations"}
          />
          <Feed
            title="Top Sci-Fi"
            items={filterItems(
              feeds.trending.filter((item) =>
                (item.genre || "").toLowerCase().includes("sci-fi"),
              ),
            )}
            onAdd={onAdd}
            watchlistKeys={watchlistKeys}
            onLoadMore={() => loadMore("trending")}
            loadingMore={loadingMore === "trending"}
          />
          <Feed
            title="Upcoming releases"
            items={filterItems(feeds.upcoming)}
            onAdd={onAdd}
            watchlistKeys={watchlistKeys}
            onLoadMore={() => loadMore("upcoming")}
            loadingMore={loadingMore === "upcoming"}
          />
        </>
      )}
    </div>
  );
}
