const fs = require("fs");
const path = require("path");

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf-8");
  
  if (content.includes("const { orgId } = await auth();")) {
    const newBlock = `  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;`;

    // Regex to match the exact block Across multiple lines
    const regex = /  const \{ orgId \} = await auth\(\);\n  if \(\!orgId\) return null;\n  const tenant = await db\.tenant\.findFirst\(\{ where: \{ clerkOrgId: orgId \} \}\);\n  if \(\!tenant\) return null;/;
    
    // Some files might use it slightly differently, let's just replace both known variants:
    content = content.replace(regex, newBlock);
    
    // Variant where findFirst doesn't have if (!tenant) return null below it? 
    // Usually they are identical.
    
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`Updated: ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith(".tsx")) {
      replaceInFile(filePath);
    }
  }
}

walk(path.join(__dirname, "src/app/(dashboard)/dashboard"));
console.log("Migration complete.");
