-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` TEXT NOT NULL,
    `role` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `city` JSON NOT NULL,
    `publication_date` DATETIME(3) NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `age` INTEGER NULL,
    `qualification` TEXT NOT NULL,
    `skill` TEXT NULL,
    `responsibility` TEXT NULL,
    `special_info` TEXT NULL,
    `doc1_title` VARCHAR(191) NULL,
    `doc1_attachment` VARCHAR(191) NULL,
    `doc2_title` VARCHAR(191) NULL,
    `doc2_attachment` VARCHAR(191) NULL,
    `req1_doc_title` VARCHAR(191) NULL,
    `req2_doc_title` VARCHAR(191) NULL,
    `job_type` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Job_job_code_key`(`job_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Profile` (
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
    `cnic` VARCHAR(100) NULL,
    `user_pic` VARCHAR(191) NULL,
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

    UNIQUE INDEX `Profile_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `city` VARCHAR(191) NOT NULL,
    `province` VARCHAR(191) NOT NULL,
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

-- CreateTable
CREATE TABLE `Experience` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `company` INTEGER NOT NULL,
    `city` INTEGER NOT NULL,
    `start_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `end_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `salary` VARCHAR(191) NOT NULL,
    `responsibility` TEXT NOT NULL,
    `reason` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Experience_profile_id_idx`(`profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Experience` ADD CONSTRAINT `Experience_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
