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
