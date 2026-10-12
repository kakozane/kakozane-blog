ALTER TABLE users
  ADD COLUMN email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci NULL,
  ADD COLUMN email_verified_at TIMESTAMP NULL,
  ADD UNIQUE KEY uq_users_email (email);
