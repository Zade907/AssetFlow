import {
  AllocationStatus,
  AssetCondition,
  AssetStatus,
  AuditCycleStatus,
  AuditRecordStatus,
  BookingStatus,
  EmployeeStatus,
  MaintenancePriority,
  MaintenanceStatus,
  PrismaClient,
  type Role,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const departments = [
  { name: "Engineering", code: "ENG" },
  { name: "HR", code: "HR" },
  { name: "Operations", code: "OPS" },
] as const;

const categories = [
  {
    name: "Electronics",
    description: "Computers, displays, phones, and other electronic equipment",
  },
  {
    name: "Furniture",
    description: "Desks, chairs, storage, and workplace furniture",
  },
  {
    name: "Vehicles",
    description: "Cars, vans, and other organization vehicles",
  },
  { name: "Rooms", description: "Meeting rooms and shared physical spaces" },
  {
    name: "Tools",
    description: "Hand tools, instruments, and shared equipment",
  },
] as const;

const employees: Array<{
  name: string;
  email: string;
  departmentCode: (typeof departments)[number]["code"];
  role: Role;
}> = [
  {
    name: "Artemis Admin",
    email: "admin@artemis.com",
    departmentCode: "OPS",
    role: "ADMIN",
  },
  {
    name: "Arjun Mehta",
    email: "arjun.mehta@artemis.com",
    departmentCode: "ENG",
    role: "ASSET_MANAGER",
  },
  {
    name: "Priya Shah",
    email: "priya.shah@artemis.com",
    departmentCode: "HR",
    role: "DEPARTMENT_HEAD",
  },
  {
    name: "Maya Patel",
    email: "maya.patel@artemis.com",
    departmentCode: "ENG",
    role: "EMPLOYEE",
  },
  {
    name: "Rohan Kumar",
    email: "rohan.kumar@artemis.com",
    departmentCode: "OPS",
    role: "EMPLOYEE",
  },
  {
    name: "Neha Singh",
    email: "neha.singh@artemis.com",
    departmentCode: "HR",
    role: "EMPLOYEE",
  },
  {
    name: "Kabir Rao",
    email: "kabir.rao@artemis.com",
    departmentCode: "ENG",
    role: "EMPLOYEE",
  },
  {
    name: "Isha Nair",
    email: "isha.nair@artemis.com",
    departmentCode: "OPS",
    role: "EMPLOYEE",
  },
  {
    name: "Sarah Manager",
    email: "sarah-manager@artemis.com",
    departmentCode: "OPS",
    role: "ASSET_MANAGER",
  },
  {
    name: "Priya Employee",
    email: "priya-employee@artemis.com",
    departmentCode: "HR",
    role: "EMPLOYEE",
  },
  {
    name: "Raj Head",
    email: "raj-head@artemis.com",
    departmentCode: "ENG",
    role: "DEPARTMENT_HEAD",
  },
];

async function main() {
  const departmentIds = new Map<string, string>();
  for (const department of departments) {
    const record = await prisma.department.upsert({
      where: { code: department.code },
      create: { ...department, status: EmployeeStatus.ACTIVE },
      update: { name: department.name, status: EmployeeStatus.ACTIVE },
    });
    departmentIds.set(department.code, record.id);
  }

  for (const category of categories) {
    await prisma.assetCategory.upsert({
      where: { name: category.name },
      create: { ...category, status: EmployeeStatus.ACTIVE },
      update: {
        description: category.description,
        status: EmployeeStatus.ACTIVE,
      },
    });
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);
  const seededEmployeeIds = new Map<string, string>();

  for (const employee of employees) {
    const departmentId = departmentIds.get(employee.departmentCode);
    if (!departmentId) {
      throw new Error(`Missing seeded department ${employee.departmentCode}`);
    }

    const user = await prisma.user.upsert({
      where: { email: employee.email },
      create: { email: employee.email, passwordHash },
      update: { passwordHash },
    });

    const record = await prisma.employee.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: employee.name,
        email: employee.email,
        departmentId,
        role: employee.role,
        status: EmployeeStatus.ACTIVE,
      },
      update: {
        name: employee.name,
        email: employee.email,
        departmentId,
        role: employee.role,
        status: EmployeeStatus.ACTIVE,
      },
    });
    seededEmployeeIds.set(employee.email, record.id);
  }

  const hrHeadId = seededEmployeeIds.get("priya.shah@artemis.com");
  if (hrHeadId) {
    await prisma.department.update({
      where: { code: "HR" },
      data: { headEmployeeId: hrHeadId },
    });
  }

  // ------------------------------------------------------------------
  // P3 seed extension: sample assets, one booking, one open maintenance
  // request. P2 will replace/extend this with the full asset registry.
  // ------------------------------------------------------------------
  const categoryLookup = await prisma.assetCategory.findMany({
    select: { id: true, name: true },
  });
  const categoryByName = new Map(categoryLookup.map((c) => [c.name, c.id]));

  const assetSeeds: Array<{
    assetTag: string;
    name: string;
    categoryName: (typeof categories)[number]["name"];
    serialNumber?: string;
    location: string;
    acquisitionCost: string;
    isBookable: boolean;
    condition?: AssetCondition;
  }> = [
    {
      assetTag: "AF-0001",
      name: 'MacBook Pro 14"',
      categoryName: "Electronics",
      serialNumber: "MBP-14-0001",
      location: "IT Storage · 3F",
      acquisitionCost: "180000.00",
      isBookable: false,
    },
    {
      assetTag: "AF-0002",
      name: "ThinkPad X1 Carbon",
      categoryName: "Electronics",
      serialNumber: "TP-X1-0002",
      location: "IT Storage · 3F",
      acquisitionCost: "145000.00",
      isBookable: false,
    },
    {
      assetTag: "AF-0003",
      name: "Meeting Room B2",
      categoryName: "Rooms",
      location: "3rd Floor · West Wing",
      acquisitionCost: "0.00",
      isBookable: true,
      condition: AssetCondition.GOOD,
    },
    {
      assetTag: "AF-0004",
      name: "Meeting Room C1",
      categoryName: "Rooms",
      location: "4th Floor · East Wing",
      acquisitionCost: "0.00",
      isBookable: true,
      condition: AssetCondition.GOOD,
    },
    {
      assetTag: "AF-0005",
      name: "Portable Projector",
      categoryName: "Electronics",
      serialNumber: "PROJ-EP-0005",
      location: "AV Cart · 3F",
      acquisitionCost: "42000.00",
      isBookable: true,
    },
    {
      assetTag: "AF-0006",
      name: "Pool Van",
      categoryName: "Vehicles",
      serialNumber: "MH12-VAN-0006",
      location: "Basement Parking",
      acquisitionCost: "780000.00",
      isBookable: true,
    },
  ];

  for (const asset of assetSeeds) {
    const categoryId = categoryByName.get(asset.categoryName);
    if (!categoryId) {
      throw new Error(`Missing seeded category ${asset.categoryName}`);
    }
    await prisma.asset.upsert({
      where: { assetTag: asset.assetTag },
      create: {
        assetTag: asset.assetTag,
        name: asset.name,
        categoryId,
        serialNumber: asset.serialNumber,
        acquisitionDate: new Date("2024-06-01T00:00:00.000Z"),
        acquisitionCost: asset.acquisitionCost,
        condition: asset.condition ?? AssetCondition.GOOD,
        location: asset.location,
        isBookable: asset.isBookable,
        status: AssetStatus.AVAILABLE,
      },
      update: {
        name: asset.name,
        categoryId,
        serialNumber: asset.serialNumber,
        location: asset.location,
        isBookable: asset.isBookable,
      },
    });
  }

  const assetRegistry = await prisma.asset.findMany({
    where: { assetTag: { in: assetSeeds.map((a) => a.assetTag) } },
    select: { id: true, assetTag: true },
  });
  const assetIdByTag = new Map(assetRegistry.map((a) => [a.assetTag, a.id]));

  const roomB2Id = assetIdByTag.get("AF-0003");
  const thinkpadId = assetIdByTag.get("AF-0002");
  const mayaId = seededEmployeeIds.get("maya.patel@artemis.com");
  const arjunId = seededEmployeeIds.get("arjun.mehta@artemis.com");

  if (roomB2Id && mayaId) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const bookingEnd = new Date(tomorrow.getTime() + 60 * 60 * 1000);

    const existingBooking = await prisma.booking.findFirst({
      where: { assetId: roomB2Id, employeeId: mayaId, startTime: tomorrow },
      select: { id: true },
    });
    if (!existingBooking) {
      await prisma.booking.create({
        data: {
          assetId: roomB2Id,
          employeeId: mayaId,
          startTime: tomorrow,
          endTime: bookingEnd,
          purpose: "Sprint planning · Team Kestrel",
          status: BookingStatus.UPCOMING,
        },
      });
    }
  }

  if (thinkpadId && arjunId) {
    const existingRequest = await prisma.maintenanceRequest.findFirst({
      where: { assetId: thinkpadId, status: MaintenanceStatus.PENDING },
      select: { id: true },
    });
    if (!existingRequest) {
      await prisma.maintenanceRequest.create({
        data: {
          assetId: thinkpadId,
          raisedById: arjunId,
          description:
            "Battery drains within 90 minutes even on light workloads; replace battery pack.",
          priority: MaintenancePriority.HIGH,
          status: MaintenanceStatus.PENDING,
        },
      });
    }
  }

  // Active allocation so dashboard "Assets Allocated" is non-zero on first login.
  const macBookId = assetIdByTag.get("AF-0001");
  const priyaEmpId = seededEmployeeIds.get("priya-employee@artemis.com");
  const sarahMgrId = seededEmployeeIds.get("sarah-manager@artemis.com");
  if (macBookId && priyaEmpId && sarahMgrId) {
    const existingAllocation = await prisma.allocation.findFirst({
      where: { assetId: macBookId, status: AllocationStatus.ACTIVE },
      select: { id: true },
    });
    if (!existingAllocation) {
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 14);
      await prisma.allocation.create({
        data: {
          assetId: macBookId,
          employeeId: priyaEmpId,
          allocatedById: sarahMgrId,
          expectedReturnDate: returnDate,
          notes: "Assigned for Q3 project work.",
          status: AllocationStatus.ACTIVE,
        },
      });
      await prisma.asset.update({
        where: { id: macBookId },
        data: { status: AssetStatus.ALLOCATED },
      });
    }
  }

  // Draft audit cycle scoped to Engineering so the close-cycle demo has content ready.
  const engineeringDeptId = departmentIds.get("ENG");
  const adminId = seededEmployeeIds.get("admin@artemis.com");
  const arjunAuditorId = seededEmployeeIds.get("arjun.mehta@artemis.com");
  if (engineeringDeptId && adminId && arjunAuditorId) {
    const existingCycle = await prisma.auditCycle.findFirst({
      where: { name: "Q3 2026 Engineering Audit" },
      select: { id: true },
    });
    if (!existingCycle) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      const cycle = await prisma.auditCycle.create({
        data: {
          name: "Q3 2026 Engineering Audit",
          scopeDepartmentId: engineeringDeptId,
          startDate,
          endDate,
          status: AuditCycleStatus.ACTIVE,
          createdById: adminId,
        },
      });
      await prisma.auditAssignment.create({
        data: { auditCycleId: cycle.id, auditorId: arjunAuditorId },
      });
      // Materialize a checklist row for every seeded asset so the auditor can mark them.
      for (const asset of assetRegistry) {
        await prisma.auditRecord.upsert({
          where: {
            auditCycleId_assetId: { auditCycleId: cycle.id, assetId: asset.id },
          },
          create: {
            auditCycleId: cycle.id,
            assetId: asset.id,
            status: AuditRecordStatus.PENDING,
          },
          update: {},
        });
      }
    }
  }

  // Keep AF-XXXX generation ahead of seeded tags.
  await prisma.$executeRaw`CREATE SEQUENCE IF NOT EXISTS asset_tag_sequence START WITH 1 INCREMENT BY 1`;
  await prisma.$executeRaw`SELECT setval('asset_tag_sequence', 6, true)`;

  console.log(
    "Seed complete: 3 departments, 5 categories, 11 employees, 6 assets, 1 allocation, 1 booking, 1 maintenance request, 1 active audit cycle.",
  );
  console.log("Admin: admin@artemis.com / demo1234");
  console.log("Asset Manager: sarah-manager@artemis.com / demo1234");
  console.log("Employee: priya-employee@artemis.com / demo1234");
  console.log("Department Head: raj-head@artemis.com / demo1234");
  console.log("Employee: maya.patel@artemis.com / demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
