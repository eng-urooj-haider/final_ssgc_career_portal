-- CreateTable
CREATE TABLE `profile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `father_name` VARCHAR(100) NULL,
    `marital_status` VARCHAR(10) NULL,
    `children` VARCHAR(2) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `birth_country` VARCHAR(191) NULL,
    `birth_city` VARCHAR(191) NULL,
    `birth_city_other` VARCHAR(191) NULL,
    `is_pakistani` VARCHAR(3) NULL,
    `cnic` VARCHAR(15) NULL,
    `passport_no` VARCHAR(15) NULL,
    `domicile` VARCHAR(20) NULL,
    `mobile_prefix` VARCHAR(10) NULL,
    `mobile_number` VARCHAR(10) NULL,
    `home_prefix` VARCHAR(10) NULL,
    `home_number` VARCHAR(10) NULL,
    `office_prefix` VARCHAR(10) NULL,
    `office_number` VARCHAR(10) NULL,
    `current_address` TINYTEXT NULL,
    `permanent_address` TINYTEXT NULL,
    `already_worked_ssgc` VARCHAR(3) NULL,
    `ssgc_employee_name` VARCHAR(100) NULL,
    `ssgc_employee_number` VARCHAR(10) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profile_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cities` VARCHAR(191) NOT NULL,
    `provience` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `countries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `country` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
