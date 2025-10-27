-- AlterTable
ALTER TABLE `materials` ADD COLUMN `portfolioId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `materials` ADD CONSTRAINT `materials_portfolioId_fkey` FOREIGN KEY (`portfolioId`) REFERENCES `portfolios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
