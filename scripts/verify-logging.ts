import { createLogger } from "@/lib/loggingService";
import * as Sentry from "@sentry/nextjs";

const logger = createLogger("test-verification");

export async function testLogging() {
  console.log("\n📝 Testing Pino Logging...\n");

  // Test Pino
  logger.info("✅ Info log test");
  logger.warn("⚠️  Warning log test");
  logger.debug("🔍 Debug log test");

  try {
    throw new Error("Test error for Pino and Sentry");
  } catch (error) {
    logger.error("❌ Error log test", error as Error, {
      testContext: "verification",
      timestamp: new Date().toISOString(),
    });
  }

  console.log("\n🔗 Testing Sentry Capture...\n");

  // Test Sentry
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    try {
      throw new Error("Test exception for Sentry verification");
    } catch (error) {
      Sentry.captureException(error, {
        contexts: {
          verification: {
            type: "test",
            timestamp: new Date().toISOString(),
          },
        },
        tags: {
          verification: "true",
        },
      });
      console.log("✅ Sentry error captured (check your Sentry dashboard)");
    }

    console.log("\n📊 Sentry Configuration Detected:");
    console.log(`   DSN configured: ${!!process.env.SENTRY_DSN}`);
    console.log(`   Public DSN configured: ${!!process.env.NEXT_PUBLIC_SENTRY_DSN}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    console.log("\n🔗 View errors in: https://sentry.io\n");
  } else {
    console.log(
      "⚠️  Sentry DSN not configured. Set SENTRY_DSN and NEXT_PUBLIC_SENTRY_DSN in .env.local\n"
    );
  }

  console.log("\n✨ Logging verification complete!\n");
  console.log("📋 You should see:");
  console.log("   1. ✅ Pino logs in this terminal output above");
  console.log("   2. ✅ Errors in Sentry dashboard (if DSN configured)\n");
}

if (require.main === module) {
  testLogging().catch(console.error);
}
