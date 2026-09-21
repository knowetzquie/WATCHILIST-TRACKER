import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "watchlist-collections-v1";
const CHALLENGE_KEY = "watchlist-challenges-v1";
const MAX_VISIBLE = 14; // posters shown on a playlist card before "See more"

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

/* ---------- shared popup shell ---------- */

function Modal({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal collections-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        <h2 className="collections-modal__title">{title}</h2>
        {subtitle && <p className="collections-modal__sub">{subtitle}</p>}
        {children}
        {footer && <div className="collections-modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

function PosterImg({ item }) {
  return item.poster_url ? (
    <img src={item.poster_url} alt="" loading="lazy" />
  ) : (
    <div className="view-grid__empty">🎬</div>
  );
}

/* ---------- "See more": every title in the playlist ---------- */

function ViewPlaylistModal({ collection, itemsById, onEdit, onAdd, onClose }) {
  const list = collection.itemIds
    .map((id) => itemsById.get(id))
    .filter(Boolean);

  return (
    <Modal
      title={collection.name}
      subtitle={collection.description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onEdit}>
            ✎ Edit playlist
          </button>
          <button type="button" className="btn btn--primary" onClick={onAdd}>
            + Add titles
          </button>
        </>
      }
    >
      <p className="collections-modal__count">
        {list.length} title{list.length !== 1 ? "s" : ""}
      </p>
      {list.length === 0 ? (
        <p className="collection-picker__empty">
          Nothing in this playlist yet.
        </p>
      ) : (
        <div className="view-grid">
          {list.map((item) => (
            <div className="view-grid__item" key={item.id} title={item.title}>
              <PosterImg item={item} />
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ---------- "+ Add titles" ---------- */

function AddTitlesModal({ collection, items, onToggle, onClose }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = items.filter((item) => item.title.toLowerCase().includes(q));

  return (
    <Modal
      title="Add titles"
      subtitle={`to ${collection.name} · ${collection.itemIds.length} selected`}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="collection-picker collection-picker--modal">
        <input
          className="collection-picker__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your titles"
          aria-label="Search titles to add"
          autoFocus
        />
        <div className="collection-picker__list">
          {shown.length === 0 ? (
            <p className="collection-picker__empty">
              No titles match “{query}”.
            </p>
          ) : (
            shown.map((item) => {
              const added = collection.itemIds.includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`collection-picker__row ${
                    added ? "collection-picker__row--on" : ""
                  }`}
                  onClick={() => onToggle(collection.id, item.id)}
                  aria-pressed={added}
                >
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt=""
                      className="collection-picker__thumb"
                    />
                  ) : (
                    <div className="collection-picker__thumb--empty">🎬</div>
                  )}
                  <span className="collection-picker__title">{item.title}</span>
                  <span className="collection-picker__mark">
                    {added ? "✓" : "+"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- edit name + description ---------- */

function EditPlaylistModal({ collection, onSave, onClose }) {
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description || "");

  function submit(event) {
    event.preventDefault();
    const title = name.trim();
    if (!title) return;
    onSave(collection.id, title, description.trim());
  }

  return (
    <Modal title="Edit playlist" onClose={onClose}>
      <form className="collection-edit" onSubmit={submit}>
        <label className="collection-edit__label">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist name"
            autoFocus
          />
        </label>
        <label className="collection-edit__label">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What ties this list together?"
            rows={3}
          />
        </label>
        <div className="collection-edit__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!name.trim()}
          >
            Save changes
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- page ---------- */

export default function CollectionsPage({ items }) {
  const [collections, setCollections] = useState(() => read(STORAGE_KEY, []));
  const [challenges, setChallenges] = useState(() => read(CHALLENGE_KEY, []));
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [challengeName, setChallengeName] = useState("");
  const [challengeGoal, setChallengeGoal] = useState(10);
  const [modal, setModal] = useState(null); // { type: "view" | "add" | "edit", id }
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmChallengeId, setConfirmChallengeId] = useState(null);

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

  const openModal = (type, id) => {
    setConfirmDeleteId(null);
    setModal({ type, id });
  };
  const closeModal = () => setModal(null);
  const modalCollection = modal
    ? collections.find((c) => c.id === modal.id)
    : null;

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
  }
  function saveCollection(collectionId, title, summary) {
    setCollections((current) =>
      current.map((collection) =>
        collection.id !== collectionId
          ? collection
          : { ...collection, name: title, description: summary },
      ),
    );
    closeModal();
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
              const isConfirming = confirmDeleteId === collection.id;
              const validIds = collection.itemIds.filter((id) =>
                itemsById.has(id),
              );
              const visibleIds = validIds.slice(0, MAX_VISIBLE);
              const hiddenCount = validIds.length - MAX_VISIBLE;
              return (
                <article className="collection-card" key={collection.id}>
                  <div>
                    <h3>{collection.name}</h3>
                    <div className="collection-card__meta-actions">
                      <span>{collection.itemIds.length} titles</span>
                      {isConfirming ? (
                        <span className="confirm-delete">
                          Delete playlist?
                          <button
                            type="button"
                            className="btn btn--tiny btn--danger"
                            onClick={() => {
                              deleteCollection(collection.id);
                              setConfirmDeleteId(null);
                            }}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            className="btn btn--tiny btn--ghost"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Edit ${collection.name}`}
                            title="Edit playlist"
                            onClick={() => openModal("edit", collection.id)}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Delete ${collection.name}`}
                            title="Delete playlist"
                            onClick={() => setConfirmDeleteId(collection.id)}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {collection.description && (
                    <p className="collection-card__desc">
                      {collection.description}
                    </p>
                  )}

                  {validIds.length > 0 && (
                    <>
                      <div className="poster-chip-row">
                        {visibleIds.map((itemId) => {
                          const item = itemsById.get(itemId);
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
                                onClick={() =>
                                  toggleItem(collection.id, itemId)
                                }
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          className="poster-chip-more"
                          onClick={() => openModal("view", collection.id)}
                        >
                          See {hiddenCount} more ▾
                        </button>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    className="collection-card__add-btn"
                    onClick={() => openModal("add", collection.id)}
                  >
                    + Add titles
                  </button>
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
                      {confirmChallengeId === challenge.id ? (
                        <span className="confirm-delete">
                          Delete?
                          <button
                            type="button"
                            className="btn btn--tiny btn--danger"
                            onClick={() => {
                              deleteChallenge(challenge.id);
                              setConfirmChallengeId(null);
                            }}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            className="btn btn--tiny btn--ghost"
                            onClick={() => setConfirmChallengeId(null)}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Delete ${challenge.name}`}
                          title="Delete challenge"
                          onClick={() => setConfirmChallengeId(challenge.id)}
                        >
                          ✕
                        </button>
                      )}
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

      {modalCollection && modal.type === "view" && (
        <ViewPlaylistModal
          collection={modalCollection}
          itemsById={itemsById}
          onEdit={() => openModal("edit", modalCollection.id)}
          onAdd={() => openModal("add", modalCollection.id)}
          onClose={closeModal}
        />
      )}
      {modalCollection && modal.type === "add" && (
        <AddTitlesModal
          collection={modalCollection}
          items={items}
          onToggle={toggleItem}
          onClose={closeModal}
        />
      )}
      {modalCollection && modal.type === "edit" && (
        <EditPlaylistModal
          collection={modalCollection}
          onSave={saveCollection}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
