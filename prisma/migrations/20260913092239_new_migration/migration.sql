-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('USER', 'ADMIN', 'RECRUITER') NOT NULL DEFAULT 'USER',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `first_name` VARCHAR(100) NULL,
    `last_name` VARCHAR(100) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `father_name` VARCHAR(100) NULL,
    `marital_status` ENUM('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED') NULL,
    `children_count` INTEGER NULL DEFAULT 0,
    `date_of_birth` DATE NULL,
    `birth_country_id` INTEGER NULL,
    `birth_city_id` INTEGER NULL,
    `birth_city_other` VARCHAR(100) NULL,
    `is_pakistani` BOOLEAN NOT NULL DEFAULT true,
    `cnic` VARCHAR(20) NULL,
    `user_pic` VARCHAR(191) NULL,
    `passport_no` VARCHAR(20) NULL,
    `domicile` VARCHAR(50) NULL,
    `mobile_prefix` VARCHAR(10) NULL,
    `mobile_number` VARCHAR(20) NULL,
    `home_prefix` VARCHAR(10) NULL,
    `home_number` VARCHAR(20) NULL,
    `office_prefix` VARCHAR(10) NULL,
    `office_number` VARCHAR(20) NULL,
    `current_address` TEXT NULL,
    `permanent_address` TEXT NULL,
    `already_worked_ssgc` BOOLEAN NOT NULL DEFAULT false,
    `ssgc_employee_name` VARCHAR(100) NULL,
    `ssgc_employee_number` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_code` VARCHAR(50) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `cities` JSON NULL,
    `publication_date` DATETIME(3) NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `max_age` INTEGER NULL,
    `qualification` TEXT NOT NULL,
    `skill` TEXT NULL,
    `responsibility` TEXT NULL,
    `special_info` TEXT NULL,
    `job_type` ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP') NOT NULL,
    `email` VARCHAR(191) NULL,
    `doc1_title` VARCHAR(150) NULL,
    `doc1_attachment` VARCHAR(255) NULL,
    `doc2_title` VARCHAR(150) NULL,
    `doc2_attachment` VARCHAR(255) NULL,
    `req1_doc_title` VARCHAR(150) NULL,
    `req2_doc_title` VARCHAR(150) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `jobs_job_code_key`(`job_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `experiences` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `job_title` VARCHAR(100) NOT NULL,
    `company` VARCHAR(150) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `country` VARCHAR(100) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `is_current` BOOLEAN NOT NULL DEFAULT false,
    `salary` DECIMAL(12, 2) NULL,
    `responsibility` TEXT NULL,
    `reason_for_leave` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `experiences_profile_id_idx`(`profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qualification_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `profile_id` INTEGER NOT NULL,
    `qualification_group_id` INTEGER NULL,
    `qualification_id` INTEGER NULL,
    `institution_id` INTEGER NULL,
    `group_other` VARCHAR(100) NULL,
    `qualification_other` VARCHAR(100) NULL,
    `institution_other` VARCHAR(150) NULL,
    `country` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `city_other` VARCHAR(100) NULL,
    `from_date` DATE NOT NULL,
    `to_date` DATE NULL,
    `document_path` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `qualification_details_profile_id_idx`(`profile_id`),
    INDEX `qualification_details_qualification_group_id_idx`(`qualification_group_id`),
    INDEX `qualification_details_qualification_id_idx`(`qualification_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qualification_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `group_name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qualifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `qualification_group_id` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `qualifications_qualification_group_id_idx`(`qualification_group_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `institutions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `city_name` VARCHAR(100) NOT NULL,
    `province` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `countries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `country_name` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `experiences` ADD CONSTRAINT `experiences_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualification_details` ADD CONSTRAINT `qualification_details_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualification_details` ADD CONSTRAINT `qualification_details_qualification_group_id_fkey` FOREIGN KEY (`qualification_group_id`) REFERENCES `qualification_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualification_details` ADD CONSTRAINT `qualification_details_qualification_id_fkey` FOREIGN KEY (`qualification_id`) REFERENCES `qualifications`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualification_details` ADD CONSTRAINT `qualification_details_institution_id_fkey` FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualifications` ADD CONSTRAINT `qualifications_qualification_group_id_fkey` FOREIGN KEY (`qualification_group_id`) REFERENCES `qualification_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
