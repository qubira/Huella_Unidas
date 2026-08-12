-- Huellas Unidas — esquema Postgres (Neon)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  phone         text,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'user',
  verified      boolean NOT NULL DEFAULT false,
  blocked       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text NOT NULL,
  status        text NOT NULL,
  name          text,
  species       text,
  breed         text,
  sex           text,
  age           text,
  size          text,
  color         text,
  features      text,
  microchip     boolean NOT NULL DEFAULT false,
  collar        boolean NOT NULL DEFAULT false,
  health        text,
  reward        text,
  photos        text[] NOT NULL DEFAULT '{}',
  date          date,
  time          text,
  address       text,
  district      text,
  province      text,
  department    text,
  lat           double precision,
  lng           double precision,
  description   text,
  owner_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  vaccines      boolean NOT NULL DEFAULT false,
  sterilized    boolean NOT NULL DEFAULT false,
  story         text,
  requirements  text,
  flagged       boolean NOT NULL DEFAULT false,
  confirmed_by  uuid[] NOT NULL DEFAULT '{}',
  reunited_at   timestamptz,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pets_kind_status ON pets(kind, status);
CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(owner_id);

CREATE TABLE IF NOT EXISTS pet_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  reason      text,
  by_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  from_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text        text NOT NULL,
  shared      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_pet ON messages(pet_id);

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text,
  title       text NOT NULL,
  body        text,
  pet_id      uuid REFERENCES pets(id) ON DELETE SET NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifs_user_read ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS favorites (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id      uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pet_id)
);
