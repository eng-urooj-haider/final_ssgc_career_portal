/*
  Warnings:

  - You are about to drop the column `cities` on the `cities` table. All the data in the column will be lost.
  - Added the required column `city` to the `cities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cities` DROP COLUMN `city`,
    ADD COLUMN `city` VARCHAR(191) NOT NULL after id;
