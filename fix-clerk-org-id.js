const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/suspendido/page.tsx',
  'src/app/(dashboard)/dashboard/alumnos/[id]/page.tsx',
  'src/app/(dashboard)/dashboard/grupos/[id]/page.tsx',
  'src/app/(dashboard)/dashboard/alumnos/[id]/editar/page.tsx',
  'src/app/(dashboard)/dashboard/grupos/[id]/editar/page.tsx',
  'src/app/(dashboard)/dashboard/grupos/page.tsx',
];

for (const relPath of filesToUpdate) {
  const filePath = path.join(process.cwd(), relPath);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace auth() orgId extraction with userId
    content = content.replace(/const\s+\{\s*orgId\s*\}\s*=\s*await\s+auth\(\);/g, `const { userId } = await auth();`);
    content = content.replace(/if\s*\(!orgId\)\s*return\s*null;/g, `if (!userId) return null;`);
    content = content.replace(/if\s*\(!orgId\)\s*redirect\("/g, `if (!userId) redirect("`);

    // Replace tenant fetch
    content = content.replace(/const\s+tenant\s*=\s*await\s+db\.tenant\.findFirst\(\{\s*where:\s*\{\s*clerkOrgId:\s*orgId\s*\}\s*\}\);/g, 
      `const user = await db.user.findUnique({ where: { clerkId: userId } });\n  const tenant = user?.activeTenantId ? await db.tenant.findUnique({ where: { id: user.activeTenantId } }) : null;`);

    // Fix the suspendido page which is slightly different:
    content = content.replace(/\?\s*await\s+db\.tenant\.findFirst\(\{\s*where:\s*\{\s*clerkOrgId:\s*orgId\s*\}\s*,\s*select:\s*\{\s*name:\s*true,\s*plan:\s*true\s*\}\s*\}\)/g,
      `? await db.user.findUnique({ where: { clerkId: userId } }).then(u => u?.activeTenantId ? db.tenant.findUnique({ where: { id: u.activeTenantId }, select: { name: true, plan: true } }) : null)`);

    content = content.replace(/orgId/g, `userId`); // Just in case any rogue orgId usages

    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${filePath}`);
  }
}
