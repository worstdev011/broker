-- AlterTable: add display_id as autoincrement unique column to users
ALTER TABLE "users" ADD COLUMN "display_id" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_display_id_key" ON "users"("display_id");
