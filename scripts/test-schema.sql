-- stampchain.io Test Database Schema
-- Directly derived from btc_stamps/indexer/table_schema.sql (production)
-- Only includes tables needed for API endpoint testing
-- Updated: 2026-02-13 - Aligned 1:1 with production indexer schema

-- ============================================================
-- Drop existing tables (reverse dependency order)
-- ============================================================

DROP TABLE IF EXISTS stamp_sales_history;
DROP TABLE IF EXISTS sales_history_checkpoints;
DROP TABLE IF EXISTS stamp_market_data;
DROP TABLE IF EXISTS stamp_holder_cache;
DROP TABLE IF EXISTS market_data_sources;
DROP TABLE IF EXISTS collection_market_data;
DROP TABLE IF EXISTS collection_stamps;
DROP TABLE IF EXISTS collection_creators;
DROP TABLE IF EXISTS collections;
DROP TABLE IF EXISTS owners;
DROP TABLE IF EXISTS recipients;
DROP TABLE IF EXISTS src101price;
DROP TABLE IF EXISTS SRC101;
DROP TABLE IF EXISTS SRC101Valid;
DROP TABLE IF EXISTS src20_market_data;
DROP TABLE IF EXISTS balances;
DROP TABLE IF EXISTS src20_token_stats;
DROP TABLE IF EXISTS src20_metadata;
DROP TABLE IF EXISTS SRC20Valid;
DROP TABLE IF EXISTS StampTableV4;
DROP TABLE IF EXISTS creator;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS blocks;

-- ============================================================
-- Core Tables (from indexer/table_schema.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS blocks (
  `block_index` INT,
  `block_hash` VARCHAR(64),
  `block_time` datetime,
  `previous_block_hash` VARCHAR(64) UNIQUE,
  `difficulty` FLOAT,
  `ledger_hash` VARCHAR(64),
  `txlist_hash` VARCHAR(64),
  `messages_hash` VARCHAR(64),
  `indexed` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`block_index`, `block_hash`),
  UNIQUE (`block_hash`),
  UNIQUE (`previous_block_hash`),
  INDEX `index_hash_idx` (`block_index`, `block_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS transactions (
  `tx_index` INT,
  `tx_hash` VARCHAR(64),
  `block_index` INT,
  `block_hash` VARCHAR(64),
  `block_time` datetime,
  `source` VARCHAR(64) COLLATE utf8mb4_bin,
  `destination` TEXT COLLATE utf8mb4_bin,
  `btc_amount` BIGINT,
  `fee` BIGINT,
  `fee_rate_sat_vb` DECIMAL(10,2) NULL,
  `data` MEDIUMBLOB,
  `supported` BIT DEFAULT 1,
  `keyburn` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`tx_index`),
  UNIQUE (`tx_hash`),
  UNIQUE KEY `tx_hash_index` (`tx_hash`, `tx_index`),
  INDEX `block_hash_index` (`block_index`, `block_hash`),
  INDEX `idx_block_index_time` (`block_index`, `block_time`),
  INDEX `idx_fee_rate` (`fee_rate_sat_vb` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `StampTableV4` (
  `stamp` int NOT NULL,
  `block_index` int,
  `cpid` varchar(25) DEFAULT NULL,
  `asset_longname` varchar(255) DEFAULT NULL,
  `creator` varchar(62) COLLATE utf8mb4_bin,
  `divisible` tinyint(1) DEFAULT NULL,
  `keyburn` tinyint(1) DEFAULT NULL,
  `locked` tinyint(1) DEFAULT NULL,
  `message_index` int DEFAULT NULL,
  `stamp_base64` mediumtext,
  `stamp_mimetype` varchar(24) DEFAULT NULL,
  `stamp_url` varchar(106) DEFAULT NULL,
  `supply` bigint unsigned DEFAULT NULL,
  `block_time` datetime NULL DEFAULT NULL,
  `tx_hash` varchar(64) NOT NULL,
  `tx_index` int NOT NULL,
  `src_data` json DEFAULT NULL,
  `ident` varchar(7) DEFAULT NULL,
  `stamp_hash` varchar(255) DEFAULT NULL,
  `is_btc_stamp` tinyint(1) DEFAULT NULL,
  `is_reissue` tinyint(1) DEFAULT NULL,
  `file_hash` varchar(255) DEFAULT NULL,
  `is_valid_base64` tinyint(1) DEFAULT NULL,
  `file_size_bytes` int DEFAULT NULL,
  PRIMARY KEY (`stamp`),
  UNIQUE `tx_hash` (`tx_hash`),
  UNIQUE `stamp_hash` (`stamp_hash`),
  UNIQUE KEY `unique_cpid_stamp` (`cpid`, `stamp`),
  INDEX `ident_index` (`ident`),
  INDEX `creator_index` (`creator`(42)),
  INDEX `is_btc_stamp_index` (`is_btc_stamp`),
  INDEX `idx_stamp` (`is_btc_stamp`, `ident`, `stamp` DESC, `tx_index` DESC),
  INDEX `idx_ident_stamp` (`ident`, `stamp`),
  INDEX `idx_cpid_ident` (`cpid`, `ident`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `creator` (
  `address` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `creator` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`address`),
  INDEX `idx_creator_name` (`creator`(100)),
  INDEX `idx_address_creator` (`address`, `creator`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- ============================================================
-- SRC-20 Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS `SRC20Valid` (
  `id` VARCHAR(255) NOT NULL,
  `tx_hash` VARCHAR(64) NOT NULL,
  `tx_index` int NOT NULL,
  `block_index` int,
  `p` varchar(32),
  `op` varchar(32),
  `tick` varchar(32),
  `tick_hash` varchar(64),
  `creator` varchar(64) COLLATE utf8mb4_bin,
  `amt` decimal(38,18) DEFAULT NULL,
  `deci` int DEFAULT '18',
  `lim` BIGINT UNSIGNED DEFAULT NULL,
  `max` BIGINT UNSIGNED DEFAULT NULL,
  `destination` varchar(255) COLLATE utf8mb4_bin,
  `block_time` datetime DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  `locked_amt` decimal(38,18),
  `locked_block` int,
  `creator_bal` decimal(38,18) DEFAULT NULL,
  `destination_bal` decimal(38,18) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `tick` (`tick`),
  INDEX `op` (`op`),
  INDEX `idx_tick_hash` (`tick_hash`),
  INDEX `idx_tick_block_index` (`tick`, `block_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `balances` (
  `id` VARCHAR(255) NOT NULL,
  `address` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `p` varchar(32),
  `tick` varchar(32),
  `tick_hash` varchar(64),
  `amt` decimal(38,18),
  `locked_amt` decimal(38,18),
  `block_time` datetime,
  `last_update` int,
  PRIMARY KEY (`id`),
  UNIQUE KEY `address_p_tick_unique` (`address`, `p`, `tick`, `tick_hash`),
  INDEX `tick_tick_hash` (`tick`, `tick_hash`),
  INDEX `idx_address_tick_amt_update` (`address`, `tick`, `amt`, `last_update`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `src20_token_stats` (
  `tick` varchar(32) NOT NULL,
  `total_minted` decimal(38,18) DEFAULT NULL,
  `holders_count` int DEFAULT NULL,
  `last_updated` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tick`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `src20_metadata` (
  `tick` varchar(32) NOT NULL,
  `tick_hash` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `x` varchar(32) DEFAULT NULL,
  `tg` varchar(32) DEFAULT NULL,
  `web` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `img` varchar(32) DEFAULT NULL,
  `icon` varchar(32) DEFAULT NULL,
  `deploy_block_index` int NOT NULL,
  `deploy_tx_hash` varchar(64) NOT NULL,
  PRIMARY KEY (`tick`, `tick_hash`),
  UNIQUE KEY `tick_unique` (`tick`),
  UNIQUE KEY `tick_hash_unique` (`tick_hash`),
  INDEX `deploy_block_index` (`deploy_block_index`),
  INDEX `deploy_tx_hash` (`deploy_tx_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- ============================================================
-- SRC-101 Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS `SRC101` (
  `id` VARCHAR(255) NOT NULL,
  `tx_hash` VARCHAR(64) NOT NULL,
  `tx_index` int NOT NULL,
  `block_index` int,
  `p` varchar(32),
  `op` varchar(32),
  `name` varchar(32),
  `root` varchar(32),
  `tokenid_origin` varchar(255) DEFAULT NULL,
  `tokenid` varchar(255) DEFAULT NULL,
  `tokenid_utf8` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `img` varchar(4096) DEFAULT NULL COLLATE utf8mb4_bin,
  `description` varchar(255),
  `tick` varchar(32),
  `imglp` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `imgf` varchar(32) DEFAULT NULL COLLATE utf8mb4_bin,
  `wla` VARCHAR(66) DEFAULT NULL,
  `tick_hash` varchar(64),
  `deploy_hash` VARCHAR(64) DEFAULT NULL,
  `creator` varchar(64) COLLATE utf8mb4_bin,
  `pri` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `dua` BIGINT UNSIGNED DEFAULT NULL,
  `idua` BIGINT UNSIGNED DEFAULT NULL,
  `coef` int DEFAULT NULL,
  `lim` BIGINT UNSIGNED DEFAULT NULL,
  `mintstart` BIGINT UNSIGNED DEFAULT NULL,
  `mintend` BIGINT UNSIGNED DEFAULT NULL,
  `prim` BOOLEAN DEFAULT NULL,
  `address_btc` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `address_eth` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `txt_data` TEXT DEFAULT NULL COLLATE utf8mb4_bin,
  `owner` varchar(255) COLLATE utf8mb4_bin,
  `toaddress` varchar(255) COLLATE utf8mb4_bin,
  `destination` varchar(255) COLLATE utf8mb4_bin,
  `destination_nvalue` BIGINT UNSIGNED DEFAULT NULL,
  `block_time` datetime DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `block_index` (`block_index`),
  INDEX `idx_deploy_hash_tokenid` (`deploy_hash`, `tokenid`),
  INDEX `idx_creator_tick` (`creator`, `tick`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `SRC101Valid` (
  `id` VARCHAR(255) NOT NULL,
  `tx_hash` VARCHAR(64) NOT NULL,
  `tx_index` int NOT NULL,
  `block_index` int,
  `p` varchar(32),
  `op` varchar(32),
  `name` varchar(32),
  `root` varchar(32),
  `tokenid_origin` varchar(255) DEFAULT NULL,
  `tokenid` varchar(255) DEFAULT NULL,
  `tokenid_utf8` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `img` varchar(4096) DEFAULT NULL COLLATE utf8mb4_bin,
  `description` varchar(255),
  `tick` varchar(32),
  `imglp` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `imgf` varchar(32) DEFAULT NULL COLLATE utf8mb4_bin,
  `wla` VARCHAR(66) DEFAULT NULL,
  `tick_hash` varchar(64),
  `deploy_hash` VARCHAR(64) DEFAULT NULL,
  `creator` varchar(64) COLLATE utf8mb4_bin,
  `pri` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `dua` BIGINT UNSIGNED DEFAULT NULL,
  `idua` BIGINT UNSIGNED DEFAULT NULL,
  `coef` int DEFAULT NULL,
  `lim` BIGINT UNSIGNED DEFAULT NULL,
  `mintstart` BIGINT UNSIGNED DEFAULT NULL,
  `mintend` BIGINT UNSIGNED DEFAULT NULL,
  `prim` BOOLEAN DEFAULT NULL,
  `address_btc` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `address_eth` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `txt_data` TEXT DEFAULT NULL COLLATE utf8mb4_bin,
  `owner` varchar(255) COLLATE utf8mb4_bin,
  `toaddress` varchar(255) COLLATE utf8mb4_bin,
  `destination` varchar(255) COLLATE utf8mb4_bin,
  `destination_nvalue` BIGINT UNSIGNED DEFAULT NULL,
  `block_time` datetime DEFAULT NULL,
  `status` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `block_index` (`block_index`),
  INDEX `idx_deploy_hash` (`deploy_hash`),
  INDEX `idx_tokenid_utf8` (`tokenid_utf8`),
  INDEX `idx_creator` (`creator`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `owners` (
  `index` INT NOT NULL,
  `id` VARCHAR(255) NOT NULL,
  `p` varchar(32),
  `deploy_hash` VARCHAR(64) NOT NULL,
  `tokenid` varchar(255) NOT NULL,
  `tokenid_utf8` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `img` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `preowner` varchar(64) COLLATE utf8mb4_bin,
  `owner` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `prim` BOOLEAN DEFAULT NULL,
  `address_btc` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `address_eth` varchar(255) DEFAULT NULL COLLATE utf8mb4_bin,
  `txt_data` TEXT DEFAULT NULL COLLATE utf8mb4_bin,
  `expire_timestamp` BIGINT UNSIGNED DEFAULT NULL,
  `last_update` int,
  PRIMARY KEY (`id`),
  INDEX `owner` (`owner`),
  INDEX `deploy_hash` (`deploy_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `recipients` (
  `id` VARCHAR(255) NOT NULL,
  `p` varchar(32),
  `deploy_hash` VARCHAR(64) NOT NULL,
  `address` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `block_index` int,
  PRIMARY KEY (`id`),
  INDEX `address` (`address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `src101price` (
  `id` VARCHAR(255) NOT NULL,
  `len` INT NOT NULL,
  `price` BIGINT NOT NULL,
  `deploy_hash` VARCHAR(64) NOT NULL,
  `block_index` int,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- ============================================================
-- Collection Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS collections (
  `collection_id` BINARY(16) PRIMARY KEY,
  `collection_name` VARCHAR(255) NOT NULL UNIQUE,
  `collection_description` VARCHAR(255),
  `collection_website` VARCHAR(255),
  `collection_tg` VARCHAR(32),
  `collection_x` VARCHAR(32),
  `collection_email` VARCHAR(255),
  `collection_onchain` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS collection_creators (
  `collection_id` BINARY(16),
  `creator_address` VARCHAR(64) COLLATE utf8mb4_bin,
  PRIMARY KEY (collection_id, creator_address),
  INDEX (creator_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS collection_stamps (
  `collection_id` BINARY(16),
  `stamp` INT,
  PRIMARY KEY (collection_id, stamp),
  INDEX `idx_collection_stamp` (collection_id, stamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- ============================================================
-- Market Data Cache Tables (from indexer/table_schema.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS `stamp_market_data` (
  `cpid` VARCHAR(25) PRIMARY KEY,
  `floor_price_btc` DECIMAL(16,8) NULL,
  `recent_sale_price_btc` DECIMAL(16,8) NULL,
  `open_dispensers_count` INTEGER DEFAULT 0,
  `closed_dispensers_count` INTEGER DEFAULT 0,
  `total_dispensers_count` INTEGER DEFAULT 0,
  `holder_count` INTEGER DEFAULT 0,
  `unique_holder_count` INTEGER DEFAULT 0,
  `top_holder_percentage` DECIMAL(5,2) DEFAULT 0,
  `holder_distribution_score` DECIMAL(5,2) DEFAULT 0,
  `volume_24h_btc` DECIMAL(16,8) DEFAULT 0,
  `volume_7d_btc` DECIMAL(16,8) DEFAULT 0,
  `volume_30d_btc` DECIMAL(16,8) DEFAULT 0,
  `total_volume_btc` DECIMAL(20,8) DEFAULT 0,
  `price_source` VARCHAR(50) NULL,
  `volume_sources` JSON NULL,
  `data_quality_score` DECIMAL(3,1) DEFAULT 0,
  `confidence_level` DECIMAL(3,1) DEFAULT 0,
  `last_sale_tx_hash` VARCHAR(64) NULL,
  `last_sale_buyer_address` VARCHAR(100) NULL,
  `last_sale_dispenser_address` VARCHAR(100) NULL,
  `last_sale_btc_amount` BIGINT NULL,
  `last_sale_dispenser_tx_hash` VARCHAR(64) NULL,
  `activity_level` ENUM('HOT', 'WARM', 'COOL', 'DORMANT', 'COLD') DEFAULT 'COLD',
  `last_activity_time` INT NULL,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_dispenser_block` INTEGER NULL,
  `last_balance_block` INTEGER NULL,
  `last_price_update` TIMESTAMP NULL,
  `last_sale_block_index` INTEGER NULL,
  `update_frequency_minutes` INTEGER DEFAULT 30,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_floor_price_btc` (`floor_price_btc` DESC),
  INDEX `idx_holder_count` (`holder_count` DESC),
  INDEX `idx_last_updated` (`last_updated`),
  INDEX `idx_volume_24h` (`volume_24h_btc` DESC),
  INDEX `idx_activity_level` (`activity_level`, `last_updated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `stamp_holder_cache` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `cpid` VARCHAR(25) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(28,8) NOT NULL,
  `percentage` DECIMAL(5,2) NOT NULL,
  `rank_position` INTEGER NOT NULL,
  `balance_source` VARCHAR(50) DEFAULT 'counterparty',
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_tx_block` INTEGER NULL,
  UNIQUE KEY `unique_cpid_address` (`cpid`, `address`),
  INDEX `idx_cpid_rank` (`cpid`, `rank_position`),
  INDEX `idx_address` (`address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `src20_market_data` (
  `tick` VARCHAR(32) PRIMARY KEY,
  `price_btc` DECIMAL(16,8) NULL,
  `price_usd` DECIMAL(16,8) NULL,
  `floor_price_btc` DECIMAL(16,8) NULL,
  `price_source_type` ENUM('last_traded', 'floor_ask', 'composite', 'unknown') DEFAULT 'unknown',
  `market_cap_btc` DECIMAL(20,8) DEFAULT 0,
  `market_cap_usd` DECIMAL(20,8) DEFAULT 0,
  `volume_24h_btc` DECIMAL(16,8) DEFAULT 0,
  `volume_7d_btc` DECIMAL(16,8) DEFAULT 0,
  `volume_30d_btc` DECIMAL(16,8) DEFAULT 0,
  `total_volume_btc` DECIMAL(20,8) DEFAULT 0,
  `price_change_24h_percent` DECIMAL(8,4) DEFAULT 0,
  `price_change_7d_percent` DECIMAL(8,4) DEFAULT 0,
  `price_change_30d_percent` DECIMAL(8,4) DEFAULT 0,
  `holder_count` INTEGER DEFAULT 0,
  `circulating_supply` DECIMAL(38,18) DEFAULT 0,
  `max_supply` DECIMAL(38,18) DEFAULT 0,
  `progress_percentage` DECIMAL(5,2) DEFAULT 0.00,
  `total_minted` BIGINT DEFAULT 0,
  `total_mints` INTEGER DEFAULT 0,
  `primary_exchange` VARCHAR(50) NULL,
  `exchange_sources` JSON NULL,
  `data_quality_score` DECIMAL(3,1) DEFAULT 0,
  `confidence_level` DECIMAL(3,1) DEFAULT 0,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_price_update` TIMESTAMP NULL,
  `update_frequency_minutes` INTEGER DEFAULT 10,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_market_cap` (`market_cap_btc` DESC),
  INDEX `idx_volume_24h` (`volume_24h_btc` DESC),
  INDEX `idx_price_change` (`price_change_24h_percent` DESC),
  INDEX `idx_last_updated` (`last_updated`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE IF NOT EXISTS `collection_market_data` (
  `collection_id` BINARY(16) PRIMARY KEY,
  `floor_price_btc` DECIMAL(16,8) NULL,
  `avg_price_btc` DECIMAL(16,8) NULL,
  `total_value_btc` DECIMAL(20,8) DEFAULT 0,
  `volume_24h_btc` DECIMAL(16,8) DEFAULT 0,
  `volume_7d_btc` DECIMAL(16,8) DEFAULT 0,
  `volume_30d_btc` DECIMAL(16,8) DEFAULT 0,
  `total_volume_btc` DECIMAL(20,8) DEFAULT 0,
  `total_stamps` INTEGER DEFAULT 0,
  `unique_holders` INTEGER DEFAULT 0,
  `listed_stamps` INTEGER DEFAULT 0,
  `sold_stamps_24h` INTEGER DEFAULT 0,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_floor_price` (`floor_price_btc` DESC),
  INDEX `idx_volume_24h` (`volume_24h_btc` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- ============================================================
-- Sales History
-- ============================================================

CREATE TABLE IF NOT EXISTS `stamp_sales_history` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tx_hash` VARCHAR(64) NOT NULL,
  `block_index` INT NOT NULL,
  `block_time` INT NULL,
  `cpid` VARCHAR(255) NOT NULL,
  `sale_type` ENUM('dispenser', 'atomic_swap', 'otc', 'auction', 'dex') NOT NULL,
  `buyer_address` VARCHAR(64) NOT NULL,
  `seller_address` VARCHAR(64) NOT NULL,
  `quantity` BIGINT NOT NULL,
  `btc_amount` BIGINT NOT NULL,
  `unit_price_sats` BIGINT NOT NULL,
  `dispenser_tx_hash` VARCHAR(64) NULL,
  `swap_contract_id` VARCHAR(64) NULL,
  `platform` VARCHAR(50) NULL,
  `external_id` VARCHAR(100) NULL,
  `data_source` VARCHAR(50) DEFAULT 'counterparty',
  `notes` TEXT NULL,
  `processed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_sale` (`tx_hash`, `sale_type`, `cpid`),
  INDEX `idx_cpid` (`cpid`),
  INDEX `idx_block_time` (`block_time` DESC),
  INDEX `idx_buyer` (`buyer_address`),
  INDEX `idx_seller` (`seller_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- ============================================================
-- Node Version History (PR #704)
-- ============================================================

DROP TABLE IF EXISTS node_version_history;

CREATE TABLE `node_version_history` (
  `id`               BIGINT AUTO_INCREMENT PRIMARY KEY,
  `component_name`   VARCHAR(100) NOT NULL,
  `version_string`   VARCHAR(100) NOT NULL,
  `version_major`    INT NULL,
  `version_minor`    INT NULL,
  `version_revision` INT NULL,
  `version_suffix`   VARCHAR(50) NULL,
  `extra_info`       JSON NULL,
  `is_current`       BOOLEAN NULL DEFAULT TRUE,
  `detected_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `superseded_at`    TIMESTAMP NULL,

  UNIQUE KEY `unique_current_component` (`component_name`, `is_current`),
  INDEX `idx_component_history` (`component_name`, `detected_at` DESC),
  INDEX `idx_current_versions` (`is_current`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

-- ============================================================
-- Compatibility Views
-- ============================================================

CREATE OR REPLACE VIEW stamps AS SELECT * FROM StampTableV4;
CREATE OR REPLACE VIEW src20 AS SELECT * FROM SRC20Valid;

-- ============================================================
-- Schema creation complete
-- ============================================================
