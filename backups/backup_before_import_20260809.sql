/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;
DROP TABLE IF EXISTS `cash_registers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_registers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `cashier_name` longtext DEFAULT NULL,
  `outlet_id` bigint(20) unsigned DEFAULT NULL,
  `opening_amount` double DEFAULT NULL,
  `notes` longtext DEFAULT NULL,
  `opened_at` datetime(3) DEFAULT NULL,
  `closed_at` datetime(3) DEFAULT NULL,
  `closing_amount` double DEFAULT NULL,
  `status` varchar(191) DEFAULT 'open',
  PRIMARY KEY (`id`),
  KEY `idx_cash_registers_created_at` (`created_at`),
  KEY `idx_cash_registers_deleted_at` (`deleted_at`),
  KEY `idx_cash_registers_user_id` (`user_id`),
  KEY `idx_cash_registers_outlet_id` (`outlet_id`),
  KEY `idx_cash_registers_opened_at` (`opened_at`),
  KEY `idx_cash_registers_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `cash_registers` WRITE;
/*!40000 ALTER TABLE `cash_registers` DISABLE KEYS */;
INSERT INTO `cash_registers` VALUES
(1,'2026-08-04 02:09:29.925','2026-08-04 09:50:35.452',NULL,1,'Owner Singgah',1,500000,'Uang receh awal','2026-08-04 02:09:29.924','2026-08-04 09:50:35.452',50000,'closed'),
(2,'2026-08-04 02:29:15.558','2026-08-04 02:29:15.558',NULL,2,'Toni',0,200000,'kas awal buka','2026-08-04 02:29:15.557',NULL,NULL,'open');
/*!40000 ALTER TABLE `cash_registers` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `title` longtext DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `category` longtext DEFAULT NULL,
  `cost_type` varchar(191) DEFAULT 'fixed',
  `date` datetime(3) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `notes` longtext DEFAULT NULL,
  `outlet_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_created_at` (`created_at`),
  KEY `idx_expenses_deleted_at` (`deleted_at`),
  KEY `idx_expenses_date` (`date`),
  KEY `idx_expenses_outlet_id` (`outlet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `name` longtext DEFAULT NULL,
  `unit` longtext DEFAULT NULL,
  `current_stock` double DEFAULT NULL,
  `min_stock` double DEFAULT NULL,
  `cost_per_unit` double DEFAULT NULL,
  `outlet_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ingredients_created_at` (`created_at`),
  KEY `idx_ingredients_deleted_at` (`deleted_at`),
  KEY `idx_ingredients_outlet_id` (`outlet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `ingredients` WRITE;
/*!40000 ALTER TABLE `ingredients` DISABLE KEYS */;
/*!40000 ALTER TABLE `ingredients` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `order_id` bigint(20) unsigned DEFAULT NULL,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `quantity` bigint(20) DEFAULT NULL,
  `price` double DEFAULT NULL,
  `cost` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_created_at` (`created_at`),
  KEY `idx_order_items_deleted_at` (`deleted_at`),
  KEY `idx_order_items_order_id` (`order_id`),
  KEY `fk_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_orders_order_items` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `order_number` varchar(191) DEFAULT NULL,
  `total_amount` double DEFAULT NULL,
  `payment_method` longtext DEFAULT NULL,
  `payment_status` longtext DEFAULT NULL,
  `payment_ref` longtext DEFAULT NULL,
  `status` varchar(191) DEFAULT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `cashier_name` longtext DEFAULT NULL,
  `order_time` datetime(3) DEFAULT NULL,
  `outlet_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uni_orders_order_number` (`order_number`),
  KEY `idx_orders_created_at` (`created_at`),
  KEY `idx_orders_deleted_at` (`deleted_at`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_outlet_id` (`outlet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `outlets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `outlets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `name` longtext DEFAULT NULL,
  `address` longtext DEFAULT NULL,
  `phone` longtext DEFAULT NULL,
  `code` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uni_outlets_code` (`code`),
  KEY `idx_outlets_created_at` (`created_at`),
  KEY `idx_outlets_deleted_at` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `outlets` WRITE;
/*!40000 ALTER TABLE `outlets` DISABLE KEYS */;
INSERT INTO `outlets` VALUES
(1,'2026-08-04 01:37:45.584','2026-08-04 01:37:45.584',NULL,'Singgah Coffee','','','SGH-001');
/*!40000 ALTER TABLE `outlets` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `processed_webhooks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `processed_webhooks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `webhook_id` varchar(191) DEFAULT NULL,
  `status` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uni_processed_webhooks_webhook_id` (`webhook_id`),
  KEY `idx_processed_webhooks_created_at` (`created_at`),
  KEY `idx_processed_webhooks_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `processed_webhooks` WRITE;
/*!40000 ALTER TABLE `processed_webhooks` DISABLE KEYS */;
/*!40000 ALTER TABLE `processed_webhooks` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `name` longtext DEFAULT NULL,
  `category` longtext DEFAULT NULL,
  `price` double DEFAULT NULL,
  `cost` double DEFAULT NULL,
  `stock` bigint(20) DEFAULT NULL,
  `sku` varchar(191) DEFAULT NULL,
  `description` longtext DEFAULT NULL,
  `image_url` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uni_products_sku` (`sku`),
  KEY `idx_products_created_at` (`created_at`),
  KEY `idx_products_deleted_at` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `recipe_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipe_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `product_id` bigint(20) unsigned DEFAULT NULL,
  `ingredient_id` bigint(20) unsigned DEFAULT NULL,
  `quantity` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_recipe_items_created_at` (`created_at`),
  KEY `idx_recipe_items_deleted_at` (`deleted_at`),
  KEY `fk_products_recipe` (`product_id`),
  KEY `fk_recipe_items_ingredient` (`ingredient_id`),
  CONSTRAINT `fk_products_recipe` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_recipe_items_ingredient` FOREIGN KEY (`ingredient_id`) REFERENCES `ingredients` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `recipe_items` WRITE;
/*!40000 ALTER TABLE `recipe_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `recipe_items` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `key` longtext DEFAULT NULL,
  `value` longtext DEFAULT NULL,
  `setting_group` longtext DEFAULT NULL,
  `outlet_id` bigint(20) unsigned DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_key_outlet` (`key`,`outlet_id`) USING HASH,
  KEY `idx_settings_created_at` (`created_at`),
  KEY `idx_settings_deleted_at` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES
(1,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.711',NULL,'outlet_name','Singgah','profile',0),
(2,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.711',NULL,'outlet_phone','','profile',0),
(3,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.713',NULL,'outlet_address','','profile',0),
(4,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.713',NULL,'tax_percentage','10','tax',0),
(5,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.713',NULL,'service_charge','5','tax',0),
(6,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.729',NULL,'printer_connection','network','printer',0),
(7,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.729',NULL,'printer_ip','','printer',0),
(8,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.743',NULL,'printer_bluetooth_address','','printer',0),
(9,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.735',NULL,'printer_width','80mm','printer',0),
(10,'2026-08-04 01:37:45.582','2026-08-04 03:09:07.736',NULL,'auto_print','true','printer',0),
(11,'2026-08-04 02:11:42.451','2026-08-04 03:09:07.715',NULL,'enable_stock_alerts','true','general',0),
(12,'2026-08-04 02:11:42.466','2026-08-04 03:09:07.721',NULL,'enable_daily_summary','false','general',0),
(13,'2026-08-04 02:11:42.467','2026-08-04 03:09:07.725',NULL,'outlet_description','','general',0),
(14,'2026-08-04 02:11:42.471','2026-08-04 03:09:07.725',NULL,'sop_manager','','general',0),
(15,'2026-08-04 02:11:42.471','2026-08-04 03:09:07.721',NULL,'notification_email','owner@singgah.coffee','general',0),
(16,'2026-08-04 02:11:42.472','2026-08-04 03:09:07.725',NULL,'outlet_logo_url','/uploads/logo/logo_1785785665.jpeg','general',0),
(17,'2026-08-04 02:11:42.473','2026-08-04 03:09:07.725',NULL,'sop_cashier','','general',0),
(18,'2026-08-04 02:11:42.485','2026-08-04 03:09:07.736',NULL,'xendit_api_key','','general',0),
(19,'2026-08-04 02:11:42.491','2026-08-04 03:09:07.736',NULL,'xendit_callback_token','','general',0),
(20,'2026-08-04 02:11:42.503','2026-08-04 03:09:07.737',NULL,'initial_capital','40000000','general',0),
(21,'2026-08-04 02:11:42.504','2026-08-04 03:09:07.737',NULL,'initial_capital_amortization_months','24','general',0);
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `stock_mutations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_mutations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `ingredient_id` bigint(20) unsigned DEFAULT NULL,
  `type` longtext DEFAULT NULL,
  `quantity` double DEFAULT NULL,
  `reference_id` longtext DEFAULT NULL,
  `notes` longtext DEFAULT NULL,
  `date` datetime(3) DEFAULT NULL,
  `outlet_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stock_mutations_created_at` (`created_at`),
  KEY `idx_stock_mutations_deleted_at` (`deleted_at`),
  KEY `idx_stock_mutations_ingredient_id` (`ingredient_id`),
  KEY `idx_stock_mutations_outlet_id` (`outlet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `stock_mutations` WRITE;
/*!40000 ALTER TABLE `stock_mutations` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_mutations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `token_blacklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `token_blacklist` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `jti` varchar(191) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `token` longtext NOT NULL,
  `revoked_at` datetime(3) DEFAULT NULL,
  `expires_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uni_token_blacklist_jti` (`jti`),
  KEY `idx_token_blacklist_user_id` (`user_id`),
  KEY `idx_token_blacklist_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `token_blacklist` WRITE;
/*!40000 ALTER TABLE `token_blacklist` DISABLE KEYS */;
/*!40000 ALTER TABLE `token_blacklist` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  `deleted_at` datetime(3) DEFAULT NULL,
  `name` longtext DEFAULT NULL,
  `email` varchar(191) DEFAULT NULL,
  `password` longtext DEFAULT NULL,
  `role` longtext DEFAULT NULL,
  `outlet_id` bigint(20) unsigned DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uni_users_email` (`email`),
  KEY `idx_users_created_at` (`created_at`),
  KEY `idx_users_deleted_at` (`deleted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'2026-08-04 01:37:45.580','2026-08-04 01:37:45.584',NULL,'Owner Singgah','owner@singgah.coffee','$2a$10$DbDagF70lgB0wuEn5UWmdOcI9cTh8gaJefZ88U8zU97cO4hs6kcVC','owner',1),
(2,'2026-08-04 02:07:49.904','2026-08-04 02:07:49.904',NULL,'Toni','kasir@singgah.coffee','$2a$10$SuQ/LTmQ39SU7ASLE6gY/OlmsrtTYTEZ70HtIEAOslT09pzmeJPiu','cashier',0),
(3,'2026-08-04 02:08:28.641','2026-08-04 02:08:28.641',NULL,'sula','manajer@singgah.coffee','$2a$10$lQavtuqbw.1qng/glUZzueGFL6zKAs0y8/pWKxnOTjX8jPOJXX5Le','manager',0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

