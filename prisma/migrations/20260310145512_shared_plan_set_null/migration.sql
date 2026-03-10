-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SharedPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "planId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SharedPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SharedPlan" ("createdAt", "id", "planId", "token") SELECT "createdAt", "id", "planId", "token" FROM "SharedPlan";
DROP TABLE "SharedPlan";
ALTER TABLE "new_SharedPlan" RENAME TO "SharedPlan";
CREATE UNIQUE INDEX "SharedPlan_token_key" ON "SharedPlan"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
