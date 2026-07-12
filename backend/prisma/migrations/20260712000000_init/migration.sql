-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN');
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED');
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR');
CREATE TYPE "AllocationStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OVERDUE');
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BookingStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AuditCycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE "AuditRecordStatus" AS ENUM ('PENDING', 'VERIFIED', 'MISSING', 'DAMAGED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "parentDepartmentId" TEXT,
    "headEmployeeId" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "departmentId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "customFields" JSONB,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "serialNumber" TEXT,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "acquisitionCost" DECIMAL(12,2) NOT NULL,
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "location" TEXT NOT NULL,
    "photoUrl" TEXT,
    "isBookable" BOOLEAN NOT NULL DEFAULT false,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "customData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnDate" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "conditionOnReturn" "AssetCondition",
    "notes" TEXT,
    "status" "AllocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "allocatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TransferRequest" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fromEmployeeId" TEXT NOT NULL,
    "toEmployeeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "approvedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MaintenanceRequest" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "photoUrl" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTechnicianId" TEXT,
    "approvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditCycle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopeDepartmentId" TEXT,
    "scopeLocation" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AuditCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuditCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditAssignment" (
    "id" TEXT NOT NULL,
    "auditCycleId" TEXT NOT NULL,
    "auditorId" TEXT NOT NULL,
    CONSTRAINT "AuditAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditRecord" (
    "id" TEXT NOT NULL,
    "auditCycleId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "auditorId" TEXT,
    "status" "AuditRecordStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3),
    CONSTRAINT "AuditRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");
CREATE INDEX "Department_parentDepartmentId_idx" ON "Department"("parentDepartmentId");
CREATE INDEX "Department_headEmployeeId_idx" ON "Department"("headEmployeeId");
CREATE INDEX "Department_status_idx" ON "Department"("status");
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");
CREATE INDEX "Employee_role_status_idx" ON "Employee"("role", "status");
CREATE UNIQUE INDEX "AssetCategory_name_key" ON "AssetCategory"("name");
CREATE INDEX "AssetCategory_status_idx" ON "AssetCategory"("status");
CREATE UNIQUE INDEX "Asset_assetTag_key" ON "Asset"("assetTag");
CREATE UNIQUE INDEX "Asset_serialNumber_key" ON "Asset"("serialNumber");
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");
CREATE INDEX "Asset_isBookable_status_idx" ON "Asset"("isBookable", "status");
CREATE INDEX "Allocation_assetId_status_idx" ON "Allocation"("assetId", "status");
CREATE INDEX "Allocation_employeeId_status_idx" ON "Allocation"("employeeId", "status");
CREATE INDEX "Allocation_allocatedById_idx" ON "Allocation"("allocatedById");
CREATE INDEX "TransferRequest_assetId_status_idx" ON "TransferRequest"("assetId", "status");
CREATE INDEX "TransferRequest_fromEmployeeId_status_idx" ON "TransferRequest"("fromEmployeeId", "status");
CREATE INDEX "TransferRequest_toEmployeeId_status_idx" ON "TransferRequest"("toEmployeeId", "status");
CREATE INDEX "TransferRequest_approvedById_idx" ON "TransferRequest"("approvedById");
CREATE INDEX "Booking_assetId_startTime_endTime_idx" ON "Booking"("assetId", "startTime", "endTime");
CREATE INDEX "Booking_employeeId_startTime_idx" ON "Booking"("employeeId", "startTime");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "MaintenanceRequest_assetId_status_idx" ON "MaintenanceRequest"("assetId", "status");
CREATE INDEX "MaintenanceRequest_raisedById_status_idx" ON "MaintenanceRequest"("raisedById", "status");
CREATE INDEX "MaintenanceRequest_assignedTechnicianId_idx" ON "MaintenanceRequest"("assignedTechnicianId");
CREATE INDEX "MaintenanceRequest_approvedById_idx" ON "MaintenanceRequest"("approvedById");
CREATE INDEX "MaintenanceRequest_priority_status_idx" ON "MaintenanceRequest"("priority", "status");
CREATE INDEX "AuditCycle_scopeDepartmentId_idx" ON "AuditCycle"("scopeDepartmentId");
CREATE INDEX "AuditCycle_createdById_idx" ON "AuditCycle"("createdById");
CREATE INDEX "AuditCycle_status_startDate_idx" ON "AuditCycle"("status", "startDate");
CREATE INDEX "AuditAssignment_auditorId_idx" ON "AuditAssignment"("auditorId");
CREATE UNIQUE INDEX "AuditAssignment_auditCycleId_auditorId_key" ON "AuditAssignment"("auditCycleId", "auditorId");
CREATE INDEX "AuditRecord_assetId_idx" ON "AuditRecord"("assetId");
CREATE INDEX "AuditRecord_auditorId_status_idx" ON "AuditRecord"("auditorId", "status");
CREATE UNIQUE INDEX "AuditRecord_auditCycleId_assetId_key" ON "AuditRecord"("auditCycleId", "assetId");
CREATE INDEX "Notification_employeeId_isRead_idx" ON "Notification"("employeeId", "isRead");
CREATE INDEX "Notification_relatedEntityType_relatedEntityId_idx" ON "Notification"("relatedEntityType", "relatedEntityId");
CREATE INDEX "ActivityLog_employeeId_createdAt_idx" ON "ActivityLog"("employeeId", "createdAt");
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_headEmployeeId_fkey" FOREIGN KEY ("headEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TransferRequest" ADD CONSTRAINT "TransferRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaintenanceRequest" ADD CONSTRAINT "MaintenanceRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditCycle" ADD CONSTRAINT "AuditCycle_scopeDepartmentId_fkey" FOREIGN KEY ("scopeDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditCycle" ADD CONSTRAINT "AuditCycle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditAssignment" ADD CONSTRAINT "AuditAssignment_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "AuditCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditAssignment" ADD CONSTRAINT "AuditAssignment_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_auditCycleId_fkey" FOREIGN KEY ("auditCycleId") REFERENCES "AuditCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditRecord" ADD CONSTRAINT "AuditRecord_auditorId_fkey" FOREIGN KEY ("auditorId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
