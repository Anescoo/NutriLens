-- CreateTable
CREATE TABLE "PlanLike" (
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "planId"),
    CONSTRAINT "PlanLike_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WorkoutPlan_isPublic_idx" ON "WorkoutPlan"("isPublic");
