CREATE TABLE configuration (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  start_at BIGINT NOT NULL,
  end_at BIGINT NOT NULL,
  status TEXT NOT NULL,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT bookings_status CHECK (status IN ('pendente','confirmado','recusado','cancelado','concluido')),
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist
    (int8range(start_at, end_at, '[)') WITH &&)
    WHERE (status IN ('pendente','confirmado'))
);

CREATE INDEX bookings_user ON bookings (user_id);
CREATE INDEX bookings_schedule ON bookings (start_at, end_at, status);

CREATE TABLE audit (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  occurred_at BIGINT NOT NULL
);

CREATE TABLE rate_limits (
  rate_key TEXT PRIMARY KEY,
  window_id BIGINT NOT NULL,
  request_count INTEGER NOT NULL
);
