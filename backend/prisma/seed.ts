import { EmployeeStatus, PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const departments = [
  { name: "Engineering", code: "ENG" },
  { name: "HR", code: "HR" },
  { name: "Operations", code: "OPS" },
] as const;

const categories = [
  { name: "Electronics", description: "Computers, displays, phones, and other electronic equipment" },
  { name: "Furniture", description: "Desks, chairs, storage, and workplace furniture" },
  { name: "Vehicles", description: "Cars, vans, and other organization vehicles" },
  { name: "Rooms", description: "Meeting rooms and shared physical spaces" },
  { name: "Tools", description: "Hand tools, instruments, and shared equipment" },
] as const;

const employees: Array<{
  name: string;
  email: string;
  departmentCode: (typeof departments)[number]["code"];
  role: Role;
}> = [
  { name: "Artemis Admin", email: "admin@artemis.com", departmentCode: "OPS", role: "ADMIN" },
  { name: "Arjun Mehta", email: "arjun.mehta@artemis.com", departmentCode: "ENG", role: "ASSET_MANAGER" },
  { name: "Priya Shah", email: "priya.shah@artemis.com", departmentCode: "HR", role: "DEPARTMENT_HEAD" },
  { name: "Maya Patel", email: "maya.patel@artemis.com", departmentCode: "ENG", role: "EMPLOYEE" },
  { name: "Rohan Kumar", email: "rohan.kumar@artemis.com", departmentCode: "OPS", role: "EMPLOYEE" },
  { name: "Neha Singh", email: "neha.singh@artemis.com", departmentCode: "HR", role: "EMPLOYEE" },
  { name: "Kabir Rao", email: "kabir.rao@artemis.com", departmentCode: "ENG", role: "EMPLOYEE" },
  { name: "Isha Nair", email: "isha.nair@artemis.com", departmentCode: "OPS", role: "EMPLOYEE" },
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
      update: { description: category.description, status: EmployeeStatus.ACTIVE },
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
    await prisma.department.update({ where: { code: "HR" }, data: { headEmployeeId: hrHeadId } });
  }

  console.log("Seed complete: 3 departments, 5 categories, and exactly 8 seeded employees.");
  console.log("Admin: admin@artemis.com / demo1234");
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
