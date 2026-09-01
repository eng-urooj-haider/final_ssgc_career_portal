-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `job_code` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `city_1` VARCHAR(191) NOT NULL,
    `city_2` VARCHAR(191) NULL,
    `city_3` VARCHAR(191) NULL,
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
