-- Threads and messages. Text only; see docs/SPEC for the contract.
CREATE TABLE IF NOT EXISTS threads (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  model      TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  thread_id  TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS messages_thread_created ON messages(thread_id, created_at);
