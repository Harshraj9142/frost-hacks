/**
 * Privacy Migration Script
 * 
 * Migrates existing data to privacy-compliant format:
 * - Anonymizes user IDs
 * - Removes PII from queries and responses
 * - Adds privacy metadata
 * - Generates privacy reports
 * 
 * Usage: npx tsx scripts/migrate-privacy.ts
 */

import connectDB from "@/lib/mongodb";
import QueryLog from "@/models/QueryLog";
import StudentActivity from "@/models/StudentActivity";
import { secureDataForStorage, generateAnonymousId } from "@/lib/privacy";

interface MigrationStats {
  totalQueries: number;
  migratedQueries: number;
  failedQueries: number;
  piiRemoved: number;
  totalActivities: number;
  migratedActivities: number;
}

async function migratePrivacy() {
  console.log("🔒 Starting Privacy Migration...\n");
  console.log("This will anonymize user data and remove PII from existing records.\n");
  
  const stats: MigrationStats = {
    totalQueries: 0,
    migratedQueries: 0,
    failedQueries: 0,
    piiRemoved: 0,
    totalActivities: 0,
    migratedActivities: 0,
  };
  
  try {
    await connectDB();
    
    // Migrate QueryLog
    console.log("=" .repeat(80));
    console.log("MIGRATING QUERY LOGS");
    console.log("=".repeat(80) + "\n");
    
    const queries = await QueryLog.find({
      $or: [
        { privacyMetadata: { $exists: false } },
        { 'privacyMetadata.piiRemoved': { $exists: false } }
      ]
    }).lean();
    
    stats.totalQueries = queries.length;
    console.log(`Found ${stats.totalQueries} queries to migrate\n`);
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      if ((i + 1) % 10 === 0) {
        console.log(`Processing query ${i + 1}/${stats.totalQueries}...`);
      }
      
      try {
        // Secure the data
        const secured = secureDataForStorage({
          query: query.query,
          response: query.response,
          userId: query.studentId,
          courseId: query.courseId,
        });
        
        // Update the query log
        await QueryLog.findByIdAndUpdate(query._id, {
          $set: {
            studentId: secured.secured.anonymousUserId,
            query: secured.secured.query,
            response: secured.secured.response,
            privacyMetadata: secured.privacyMetadata,
          },
        });
        
        stats.migratedQueries++;
        
        if (secured.privacyMetadata.piiRemoved) {
          stats.piiRemoved++;
        }
      } catch (error) {
        console.error(`Failed to migrate query ${query._id}:`, error);
        stats.failedQueries++;
      }
    }
    
    console.log(`\n✅ Query logs migrated: ${stats.migratedQueries}/${stats.totalQueries}`);
    console.log(`   PII removed from: ${stats.piiRemoved} queries`);
    console.log(`   Failed: ${stats.failedQueries}`);
    
    // Migrate StudentActivity
    console.log("\n" + "=".repeat(80));
    console.log("MIGRATING STUDENT ACTIVITIES");
    console.log("=".repeat(80) + "\n");
    
    const activities = await StudentActivity.find({}).lean();
    stats.totalActivities = activities.length;
    console.log(`Found ${stats.totalActivities} activities to migrate\n`);
    
    // Group by original studentId to maintain consistency
    const studentIdMap = new Map<string, string>();
    
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      
      if ((i + 1) % 10 === 0) {
        console.log(`Processing activity ${i + 1}/${stats.totalActivities}...`);
      }
      
      try {
        // Generate or reuse anonymous ID
        let anonymousId = studentIdMap.get(activity.studentId);
        if (!anonymousId) {
          anonymousId = generateAnonymousId(activity.studentId);
          studentIdMap.set(activity.studentId, anonymousId);
        }
        
        // Update the activity
        await StudentActivity.findByIdAndUpdate(activity._id, {
          $set: {
            studentId: anonymousId,
          },
        });
        
        stats.migratedActivities++;
      } catch (error) {
        console.error(`Failed to migrate activity ${activity._id}:`, error);
      }
    }
    
    console.log(`\n✅ Student activities migrated: ${stats.migratedActivities}/${stats.totalActivities}`);
    console.log(`   Unique students anonymized: ${studentIdMap.size}`);
    
    // Generate summary report
    console.log("\n\n" + "=".repeat(80));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(80) + "\n");
    
    console.log("Query Logs:");
    console.log(`  Total: ${stats.totalQueries}`);
    console.log(`  Migrated: ${stats.migratedQueries} (${((stats.migratedQueries / stats.totalQueries) * 100).toFixed(1)}%)`);
    console.log(`  Failed: ${stats.failedQueries}`);
    console.log(`  PII Removed: ${stats.piiRemoved} (${((stats.piiRemoved / stats.totalQueries) * 100).toFixed(1)}%)`);
    
    console.log("\nStudent Activities:");
    console.log(`  Total: ${stats.totalActivities}`);
    console.log(`  Migrated: ${stats.migratedActivities} (${((stats.migratedActivities / stats.totalActivities) * 100).toFixed(1)}%)`);
    console.log(`  Unique Students: ${studentIdMap.size}`);
    
    // Privacy compliance check
    const complianceRate = ((stats.migratedQueries / stats.totalQueries) * 100);
    
    console.log("\n📈 Privacy Compliance:");
    if (complianceRate >= 99) {
      console.log(`  ✅ EXCELLENT: ${complianceRate.toFixed(2)}% compliance`);
    } else if (complianceRate >= 95) {
      console.log(`  ⚠️  GOOD: ${complianceRate.toFixed(2)}% compliance`);
    } else {
      console.log(`  🔴 NEEDS IMPROVEMENT: ${complianceRate.toFixed(2)}% compliance`);
    }
    
    // Recommendations
    console.log("\n💡 Recommendations:");
    
    if (stats.failedQueries > 0) {
      console.log(`  ⚠️  ${stats.failedQueries} queries failed to migrate - review errors`);
    }
    
    if (stats.piiRemoved > 0) {
      console.log(`  ✅ PII successfully removed from ${stats.piiRemoved} queries`);
    }
    
    if (complianceRate < 100) {
      console.log(`  ⚠️  Re-run migration to achieve 100% compliance`);
    } else {
      console.log(`  ✅ All data successfully migrated to privacy-compliant format`);
    }
    
    console.log("\n✅ Migration Complete!\n");
    
    // Save report
    const fs = await import('fs');
    const reportPath = './privacy-migration-report.txt';
    const reportContent = [
      '='.repeat(80),
      'PRIVACY MIGRATION REPORT',
      `Generated: ${new Date().toISOString()}`,
      '='.repeat(80),
      '',
      'Query Logs:',
      `  Total: ${stats.totalQueries}`,
      `  Migrated: ${stats.migratedQueries}`,
      `  Failed: ${stats.failedQueries}`,
      `  PII Removed: ${stats.piiRemoved}`,
      '',
      'Student Activities:',
      `  Total: ${stats.totalActivities}`,
      `  Migrated: ${stats.migratedActivities}`,
      `  Unique Students: ${studentIdMap.size}`,
      '',
      'Privacy Compliance:',
      `  Rate: ${complianceRate.toFixed(2)}%`,
      '',
      'Student ID Mapping:',
      ...Array.from(studentIdMap.entries()).map(([original, anonymous]) => 
        `  ${original} → ${anonymous}`
      ),
    ].join('\n');
    
    fs.writeFileSync(reportPath, reportContent);
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
    
  } catch (error) {
    console.error("❌ Migration Error:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run migration
migratePrivacy();
