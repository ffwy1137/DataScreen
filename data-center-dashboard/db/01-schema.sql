-- 数据中心监控大屏：MySQL 建库建表（4 张原始表）
CREATE DATABASE IF NOT EXISTS dc_monitor
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE dc_monitor;

-- 主机维表
CREATE TABLE IF NOT EXISTS `host_detail` (
  `hostid`    VARCHAR(32)  NOT NULL,
  `hostname`  VARCHAR(128),
  `owner`     VARCHAR(64),
  `model`     VARCHAR(64),
  `location1` VARCHAR(64),
  `location2` VARCHAR(64),
  PRIMARY KEY (`hostid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 指标定义维表
CREATE TABLE IF NOT EXISTS `mod_detail` (
  `mod`   VARCHAR(32)  NOT NULL,
  `type`  VARCHAR(16),
  `desc`  VARCHAR(128),
  `unit`  VARCHAR(16),
  `tag`   VARCHAR(32),
  PRIMARY KEY (`mod`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 性能时序（pref_tsar）
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

-- 磁盘时序（disk_tsar）
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
