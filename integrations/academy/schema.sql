-- Run once against the Academy MySQL database before mounting the adapter.
-- Accounts remain in Academy.users. No FLAMES password/session tables are added.
CREATE TABLE IF NOT EXISTS fortisim_progress (
  user_id INT NOT NULL,
  platform ENUM('fortigate', 'paloalto') NOT NULL,
  task_id VARCHAR(100) NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, platform, task_id),
  CONSTRAINT fk_fortisim_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Separate unfinished configurations from completion markers. Reset keeps a
-- revisioned NULL tombstone so an older tab cannot resurrect deleted work.
CREATE TABLE IF NOT EXISTS fortisim_simulator_drafts (
  user_id INT NOT NULL,
  platform ENUM('fortigate', 'paloalto') NOT NULL,
  task_id VARCHAR(100) NOT NULL,
  schema_version TINYINT NOT NULL DEFAULT 1,
  scenario_version VARCHAR(64) NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 0,
  config_json JSON NULL,
  updated_at BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, platform, task_id),
  CONSTRAINT fk_fortisim_draft_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
