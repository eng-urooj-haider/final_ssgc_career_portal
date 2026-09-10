/*
  Warnings:

  - You are about to drop the column `cities` on the `cities` table. All the data in the column will be lost.
  - You are about to drop the column `provience` on the `cities` table. All the data in the column will be lost.
  - Added the required column `city` to the `cities` table without a default value. This is not possible if the table is not empty.
  - Added the required column `province` to the `cities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cities` DROP COLUMN `cities`,
    DROP COLUMN `provience`,
    ADD COLUMN `city` VARCHAR(191) NOT NULL,
    ADD COLUMN `province` VARCHAR(191) NOT NULL;

-- RedefineIndex
CREATE UNIQUE INDEX `Profile_user_id_key` ON `Profile`(`user_id`);
DROP INDEX `profile_user_id_key` ON `profile`;
