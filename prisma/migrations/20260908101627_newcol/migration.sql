/*
  Warnings:

  - You are about to drop the column `provience` on the `cities` table. All the data in the column will be lost.
  - Added the required column `province` to the `cities` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cities` DROP COLUMN `provience`,
    ADD COLUMN `province` VARCHAR(191) NOT NULL;
