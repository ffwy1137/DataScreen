USE dc_monitor;

CREATE TABLE IF NOT EXISTS `mod_detail` (
  `mod`   VARCHAR(32)  NOT NULL,
  `type`  VARCHAR(16),
  `desc`  VARCHAR(128),
  `unit`  VARCHAR(16),
  `tag`   VARCHAR(32),
  PRIMARY KEY (`mod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pref_tsar` (
  `ts`     BIGINT       NOT NULL,
  `hostid` VARCHAR(32)  NOT NULL,
  `type`   VARCHAR(16),
  `mod`    VARCHAR(32)  NOT NULL,
  `value`  DOUBLE       NOT NULL,
  `tag`    VARCHAR(32),
  PRIMARY KEY (`ts`, `hostid`, `mod`),
  INDEX `idx_host_mod_ts` (`hostid`, `mod`, `ts`),
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `disk_tsar` (
  `ts`     BIGINT       NOT NULL,
  `hostid` VARCHAR(32)  NOT NULL,
  `type`   VARCHAR(16),
  `mod`    VARCHAR(32)  NOT NULL,
  `value`  DOUBLE       NOT NULL,
  `tag`    VARCHAR(32),
  PRIMARY KEY (`ts`, `hostid`, `mod`),
  INDEX `idx_host_mod_ts` (`hostid`, `mod`, `ts`),
  INDEX `idx_ts` (`ts`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
