/*
  Warnings:

  - You are about to drop the column `city_1` on the `job` table. All the data in the column will be lost.
  - You are about to drop the column `city_2` on the `job` table. All the data in the column will be lost.
  - You are about to drop the column `city_3` on the `job` table. All the data in the column will be lost.
  - Added the required column `city` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `job` DROP COLUMN `city_1`,
    DROP COLUMN `city_2`,
    DROP COLUMN `city_3`,
    ADD COLUMN `city` JSON NOT NULL;
