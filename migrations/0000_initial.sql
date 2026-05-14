CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text,
  `email` text,
  `email_verified` integer,
  `image` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

CREATE TABLE `accounts` (
  `user_id` text NOT NULL,
  `type` text NOT NULL,
  `provider` text NOT NULL,
  `provider_account_id` text NOT NULL,
  `refresh_token` text,
  `access_token` text,
  `expires_at` integer,
  `token_type` text,
  `scope` text,
  `id_token` text,
  `session_state` text,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `accounts_provider_account_idx` ON `accounts` (`provider`, `provider_account_id`);

CREATE TABLE `sessions` (
  `session_token` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `expires` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `verification_tokens` (
  `identifier` text NOT NULL,
  `token` text NOT NULL,
  `expires` integer NOT NULL,
  PRIMARY KEY (`identifier`, `token`)
);

CREATE TABLE `authenticators` (
  `credential_id` text NOT NULL,
  `user_id` text NOT NULL,
  `provider_account_id` text NOT NULL,
  `credential_public_key` text NOT NULL,
  `counter` integer NOT NULL,
  `credential_device_type` text NOT NULL,
  `credential_backed_up` integer NOT NULL,
  `transports` text,
  PRIMARY KEY (`user_id`, `credential_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `authenticators_credential_id_unique` ON `authenticators` (`credential_id`);

CREATE TABLE `api_keys` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `purpose` text DEFAULT 'both' NOT NULL,
  `key_hash` text NOT NULL,
  `key_prefix` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `last_used_at` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);
CREATE INDEX `api_keys_user_created_at_idx` ON `api_keys` (`user_id`, `created_at`);

CREATE TABLE `wallets` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `balance_credits` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `ledger_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `amount_credits` integer NOT NULL,
  `reason` text NOT NULL,
  `source_type` text NOT NULL,
  `source_id` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `ledger_entries_user_created_at_idx` ON `ledger_entries` (`user_id`, `created_at`);

CREATE TABLE `worker_plans` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `max_accounts` integer DEFAULT 1 NOT NULL,
  `worker_token_hash` text NOT NULL,
  `worker_token_prefix` text NOT NULL,
  `last_seen_at` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX `worker_plans_worker_token_hash_unique` ON `worker_plans` (`worker_token_hash`);
CREATE INDEX `worker_plans_user_created_at_idx` ON `worker_plans` (`user_id`, `created_at`);
