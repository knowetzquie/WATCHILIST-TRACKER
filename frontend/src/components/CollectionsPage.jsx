import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "watchlist-collections-v1";
const CHALLENGE_KEY = "watchlist-challenges-v1";

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export default function CollectionsPage({ items }) {
  const [collections, setCollections] = useState(() => read(STORAGE_KEY, []));
  const [challenges, setChallenges] = useState(() => read(CHALLENGE_KEY, []));
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [challengeName, setChallengeName] = useState("");
  const [challengeGoal, setChallengeGoal] = useState(10);
  const [openPickerId, setOpenPickerId] = useState(null);
  const [pickerQuery, setPickerQuery] = useState("");

  const completed = useMemo(
    () => items.filter((item) => item.status === "completed"),
    [items],
  );
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  useEffect(
    () => localStorage.setItem(STORAGE_KEY, JSON.stringify(collections)),
    [collections],
  );
  useEffect(
    () => localStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenges)),
    [challenges],
  );

  function createCollection(event) {
    event.preventDefault();
    const title = name.trim();
    const summary = description.trim();
    if (!title || !summary) return;
    setCollections((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: title,
        description: summary,
        itemIds: [],
      },
    ]);
    setName("");
    setDescription("");
  }
  function deleteCollection(collectionId) {
    setCollections((current) =>
      current.filter((collection) => collection.id !== collectionId),
    );
    if (openPickerId === collectionId) {
      setOpenPickerId(null);
      setPickerQuery("");
    }
  }
  function toggleItem(collectionId, itemId) {
    setCollections((current) =>
      current.map((collection) =>
        collection.id !== collectionId
          ? collection
          : {
              ...collection,
              itemIds: collection.itemIds.includes(itemId)
                ? collection.itemIds.filter((id) => id !== itemId)
                : [...collection.itemIds, itemId],
            },
      ),
    );
  }
  function togglePicker(collectionId) {
    setOpenPickerId((current) =>
      current === collectionId ? null : collectionId,
    );
    setPickerQuery("");
  }
  function createChallenge(event) {
    event.preventDefault();
    const title = challengeName.trim();
    if (!title || Number(challengeGoal) < 1) return;
    setChallenges((current) => [
      ...current,
      { id: crypto.randomUUID(), name: title, goal: Number(challengeGoal) },
    ]);
    setChallengeName("");
    setChallengeGoal(10);
  }
  function deleteChallenge(challengeId) {
    setChallenges((current) =>
      current.filter((challenge) => challenge.id !== challengeId),
    );
  }

  return (
    <div className="feature-page">
      <header className="feature-page__intro">
        <span className="feature-page__eyebrow">
          <span className="feature-page__eyebrow-dot" />
          Collections
        </span>
        <h1 className="feature-page__headline">
          Build your <span>own shelves</span>
        </h1>
        <p className="feature-page__lede">
          Group titles by mood, theme, director, or the challenge you are
          chasing.
        </p>
      </header>
      <div className="feature-columns">
        <section className="feature-section">
          <div className="feature-section__heading">
            <h2>Themed playlists</h2>
            <span>{collections.length}</span>
          </div>
          <form
            className="inline-create inline-create--stacked"
            onSubmit={createCollection}
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Mind-bending thrillers"
              aria-label="Collection name"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What ties this list together? e.g. Twisty plots that mess with your head."
              aria-label="Collection description"
              rows={2}
            />
            <button
              type="submit"
              disabled={!name.trim() || !description.trim()}
            >
              Create list
            </button>
          </form>
          {collections.length === 0 ? (
            <p className="empty-state">Create your first collection.</p>
          ) : (
            collections.map((collection) => {
              const isOpen = openPickerId === collection.id;
              const query = pickerQuery.trim().toLowerCase();
              const filteredItems = isOpen
                ? items.filter((item) =>
                    item.title.toLowerCase().includes(query),
                  )
                : [];
              return (
                <article className="collection-card" key={collection.id}>
                  <div>
                    <h3>{collection.name}</h3>
                    <div className="collection-card__meta-actions">
                      <span>{collection.itemIds.length} titles</span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Delete ${collection.name}`}
                        title="Delete collection"
                        onClick={() => deleteCollection(collection.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {collection.description && (
                    <p className="collection-card__desc">
                      {collection.description}
                    </p>
                  )}

                  {collection.itemIds.length > 0 && (
                    <div className="poster-chip-row">
                      {collection.itemIds.map((itemId) => {
                        const item = itemsById.get(itemId);
                        if (!item) return null;
                        return (
                          <div className="poster-chip" key={itemId}>
                            {item.poster_url ? (
                              <img src={item.poster_url} alt="" />
                            ) : (
                              <div className="poster-chip__empty">🎬</div>
                            )}
                            <button
                              type="button"
                              className="poster-chip__remove"
                              aria-label={`Remove ${item.title} from ${collection.name}`}
                              title={`Remove ${item.title}`}
                              onClick={() => toggleItem(collection.id, itemId)}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    className={
                      isOpen
                        ? "collection-card__add-btn is-open"
                        : "collection-card__add-btn"
                    }
                    onClick={() => togglePicker(collection.id)}
                  >
                    {isOpen ? "Done" : "+ Add titles"}
                  </button>

                  {isOpen && (
                    <div className="collection-picker">
                      <input
                        className="collection-picker__search"
                        value={pickerQuery}
                        onChange={(event) => setPickerQuery(event.target.value)}
                        placeholder="Search your titles"
                        aria-label={`Search titles to add to ${collection.name}`}
                        autoFocus
                      />
                      <div className="collection-picker__list">
                        {filteredItems.length === 0 ? (
                          <p className="collection-picker__empty">
                            No titles match “{pickerQuery}”.
                          </p>
                        ) : (
                          filteredItems.map((item) => {
                            const added = collection.itemIds.includes(item.id);
                            return (
                              <button
                                type="button"
                                key={item.id}
                                className="collection-picker__row"
                                onClick={() =>
                                  toggleItem(collection.id, item.id)
                                }
                              >
                                {item.poster_url ? (
                                  <img
                                    src={item.poster_url}
                                    alt=""
                                    className="collection-picker__thumb"
                                  />
                                ) : (
                                  <div className="collection-picker__thumb--empty">
                                    🎬
                                  </div>
                                )}
                                <span className="collection-picker__title">
                                  {item.title}
                                </span>
                                <span className="collection-picker__mark">
                                  {added ? "✓" : "+"}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </section>
        <section className="feature-section">
          <div className="feature-section__heading">
            <h2>Watch challenges</h2>
            <span>{completed.length} completed</span>
          </div>
          <form className="inline-create" onSubmit={createChallenge}>
            <input
              value={challengeName}
              onChange={(event) => setChallengeName(event.target.value)}
              placeholder="50 films in 2026"
              aria-label="Challenge name"
            />
            <input
              type="number"
              min="1"
              value={challengeGoal}
              onChange={(event) => setChallengeGoal(event.target.value)}
              aria-label="Challenge goal"
            />
            <button type="submit">Add goal</button>
          </form>
          {challenges.length === 0 ? (
            <p className="empty-state">Set a goal and make it yours.</p>
          ) : (
            challenges.map((challenge) => {
              const progress = Math.min(completed.length, challenge.goal);
              return (
                <article className="challenge-card" key={challenge.id}>
                  <div>
                    <h3>{challenge.name}</h3>
                    <div className="challenge-card__meta-actions">
                      <strong>
                        {progress} / {challenge.goal}
                      </strong>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Delete ${challenge.name}`}
                        title="Delete challenge"
                        onClick={() => deleteChallenge(challenge.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="challenge-card__track">
                    <span
                      style={{ width: `${(progress / challenge.goal) * 100}%` }}
                    />
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
