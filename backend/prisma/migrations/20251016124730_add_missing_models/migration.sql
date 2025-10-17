/*
  Warnings:

  - You are about to drop the column `category` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `format` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `uploaderId` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `portfolios` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnail` on the `portfolios` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `portfolios` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `portfolios` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `reply` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `paymentAccount` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `remark` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the `customers` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `userId` to the `materials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publisherId` to the `order_applications` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `materials` DROP FOREIGN KEY `materials_uploaderId_fkey`;

-- AlterTable
ALTER TABLE `materials` DROP COLUMN `category`,
    DROP COLUMN `format`,
    DROP COLUMN `name`,
    DROP COLUMN `size`,
    DROP COLUMN `tags`,
    DROP COLUMN `uploaderId`,
    ADD COLUMN `title` VARCHAR(191) NULL,
    ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `order_applications` ADD COLUMN `deliveredAt` DATETIME(3) NULL,
    ADD COLUMN `isRead` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `publisherId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `portfolios` DROP COLUMN `tags`,
    DROP COLUMN `thumbnail`,
    DROP COLUMN `type`,
    DROP COLUMN `url`;

-- AlterTable
ALTER TABLE `reviews` DROP COLUMN `content`,
    DROP COLUMN `reply`,
    ADD COLUMN `comment` VARCHAR(191) NULL,
    MODIFY `rating` INTEGER NULL;

-- AlterTable
ALTER TABLE `transactions` DROP COLUMN `description`,
    DROP COLUMN `paymentAccount`,
    DROP COLUMN `paymentMethod`,
    DROP COLUMN `remark`;

-- DropTable
DROP TABLE `customers`;

-- CreateIndex
CREATE INDEX `order_applications_publisherId_isRead_idx` ON `order_applications`(`publisherId`, `isRead`);

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
