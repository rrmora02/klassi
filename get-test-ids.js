/**
 * Get Test IDs from Klassi Database
 * Run this script to extract TENANT_ID, GROUP_ID, USER_ID for stress testing
 *
 * Usage: node get-test-ids.js
 */

const { PrismaClient } = require('@prisma/client');

async function getTestIds() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Extracting test IDs from database...\n');

    // Get first active tenant
    const tenant = await prisma.tenant.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!tenant) {
      console.error('❌ No active tenants found');
      process.exit(1);
    }

    console.log(`✅ Tenant: ${tenant.name}`);
    console.log(`   ID: ${tenant.id}\n`);

    // Get first active group in this tenant
    const group = await prisma.group.findFirst({
      where: {
        tenantId: tenant.id,
        isActive: true
      }
    });

    if (!group) {
      console.error('❌ No active groups found in this tenant');
      process.exit(1);
    }

    console.log(`✅ Group: ${group.name}`);
    console.log(`   ID: ${group.id}\n`);

    // Get first user with access to this tenant
    const user = await prisma.user.findFirst({
      where: {
        tenantUsers: {
          some: {
            tenantId: tenant.id
          }
        }
      }
    });

    if (!user) {
      console.error('❌ No users found for this tenant');
      process.exit(1);
    }

    console.log(`✅ User: ${user.name}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Clerk ID: ${user.clerkId}\n`);

    // Output as environment variables
    console.log('📋 Environment variables for stress testing:\n');
    console.log(`export TENANT_ID="${tenant.id}"`);
    console.log(`export GROUP_ID="${group.id}"`);
    console.log(`export USER_ID="${user.id}"`);
    console.log(`\n🚀 Run stress test with:`);
    console.log(`./run-stress-test.sh`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getTestIds();
