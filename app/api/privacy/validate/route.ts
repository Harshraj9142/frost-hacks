import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  detectAndRemovePII,
  generatePrivacyReport,
  validateEncryptionKey,
  generateAnonymousId,
} from "@/lib/privacy";
import connectDB from "@/lib/mongodb";
import QueryLog from "@/models/QueryLog";

/**
 * POST /api/privacy/validate
 * Validate privacy compliance and check for PII
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and faculty can access privacy validation
    if (session.user.role !== "admin" && session.user.role !== "faculty") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { text, userId, checkDatabase = false, limit = 100 } = await req.json();

    // Single text validation
    if (text) {
      const piiResult = detectAndRemovePII(text);
      const anonymousId = userId ? generateAnonymousId(userId) : null;

      return NextResponse.json({
        success: true,
        validation: {
          hasPII: piiResult.hasPII,
          piiDetected: piiResult.piiDetected,
          cleanedText: piiResult.cleanedText,
          originalLength: text.length,
          cleanedLength: piiResult.cleanedText.length,
          anonymousId,
        },
        recommendations: generateRecommendations(piiResult),
      });
    }

    // Database-wide privacy audit
    if (checkDatabase) {
      await connectDB();

      const queries = await QueryLog.find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const results = [];
      let totalQueries = queries.length;
      let queriesWithPII = 0;
      let queriesWithPrivacyMetadata = 0;
      let totalPrivacyScore = 0;
      const piiTypesCounts: Record<string, number> = {};

      for (const query of queries) {
        // Check if query has privacy metadata
        if (query.privacyMetadata) {
          queriesWithPrivacyMetadata++;
          totalPrivacyScore += query.privacyMetadata.privacyScore || 0;

          if (query.privacyMetadata.piiRemoved) {
            queriesWithPII++;
            query.privacyMetadata.piiTypes?.forEach((type: string) => {
              piiTypesCounts[type] = (piiTypesCounts[type] || 0) + 1;
            });
          }
        } else {
          // Legacy query without privacy metadata - check for PII
          const queryPII = detectAndRemovePII(query.query);
          const responsePII = detectAndRemovePII(query.response);

          if (queryPII.hasPII || responsePII.hasPII) {
            queriesWithPII++;
            [...queryPII.piiDetected, ...responsePII.piiDetected].forEach(type => {
              piiTypesCounts[type] = (piiTypesCounts[type] || 0) + 1;
            });
          }
        }

        results.push({
          queryId: query._id.toString(),
          hasPrivacyMetadata: !!query.privacyMetadata,
          privacyScore: query.privacyMetadata?.privacyScore || null,
          piiRemoved: query.privacyMetadata?.piiRemoved || false,
          piiTypes: query.privacyMetadata?.piiTypes || [],
        });
      }

      const avgPrivacyScore = queriesWithPrivacyMetadata > 0
        ? totalPrivacyScore / queriesWithPrivacyMetadata
        : 0;

      const complianceRate = ((totalQueries - queriesWithPII) / totalQueries) * 100;

      return NextResponse.json({
        success: true,
        summary: {
          totalQueries,
          queriesWithPII,
          queriesWithPrivacyMetadata,
          queriesWithoutPrivacyMetadata: totalQueries - queriesWithPrivacyMetadata,
          complianceRate: complianceRate.toFixed(2),
          averagePrivacyScore: avgPrivacyScore.toFixed(2),
          piiTypesCounts,
        },
        results: results.slice(0, 20), // Return first 20 for preview
        recommendations: generateDatabaseRecommendations({
          totalQueries,
          queriesWithPII,
          queriesWithPrivacyMetadata,
          complianceRate,
          avgPrivacyScore,
        }),
      });
    }

    // Encryption key validation
    const keyValidation = validateEncryptionKey();

    return NextResponse.json({
      success: true,
      encryptionKeyValidation: keyValidation,
      recommendations: keyValidation.issues.length > 0
        ? ['⚠️ Fix encryption key issues before production deployment']
        : ['✅ Encryption configuration is secure'],
    });
  } catch (error: any) {
    console.error("Privacy validation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate privacy" },
      { status: 500 }
    );
  }
}

function generateRecommendations(piiResult: ReturnType<typeof detectAndRemovePII>): string[] {
  const recommendations: string[] = [];

  if (piiResult.hasPII) {
    recommendations.push('🔴 PII detected - must be removed before storage');
    
    if (piiResult.piiDetected.includes('email')) {
      recommendations.push('⚠️ Email addresses found - replace with [EMAIL_REDACTED]');
    }
    
    if (piiResult.piiDetected.includes('phone')) {
      recommendations.push('⚠️ Phone numbers found - replace with [PHONE_REDACTED]');
    }
    
    if (piiResult.piiDetected.includes('ssn')) {
      recommendations.push('🔴 CRITICAL: SSN detected - must be removed immediately');
    }
    
    if (piiResult.piiDetected.includes('credit_card')) {
      recommendations.push('🔴 CRITICAL: Credit card detected - must be removed immediately');
    }
    
    if (piiResult.piiDetected.includes('address')) {
      recommendations.push('⚠️ Physical address found - replace with [ADDRESS_REDACTED]');
    }
    
    if (piiResult.piiDetected.includes('name')) {
      recommendations.push('⚠️ Names detected - consider anonymization');
    }
  } else {
    recommendations.push('✅ No PII detected - privacy compliant');
  }

  return recommendations;
}

function generateDatabaseRecommendations(stats: {
  totalQueries: number;
  queriesWithPII: number;
  queriesWithPrivacyMetadata: number;
  complianceRate: number;
  avgPrivacyScore: number;
}): string[] {
  const recommendations: string[] = [];

  if (stats.complianceRate < 95) {
    recommendations.push(`🔴 CRITICAL: Only ${stats.complianceRate}% compliance (target: >95%)`);
    recommendations.push('Run privacy migration to clean existing data');
  } else if (stats.complianceRate < 99) {
    recommendations.push(`⚠️ WARNING: ${stats.complianceRate}% compliance (target: >99%)`);
  } else {
    recommendations.push(`✅ EXCELLENT: ${stats.complianceRate}% privacy compliance`);
  }

  const metadataRate = (stats.queriesWithPrivacyMetadata / stats.totalQueries) * 100;
  if (metadataRate < 100) {
    recommendations.push(`⚠️ ${(100 - metadataRate).toFixed(1)}% of queries lack privacy metadata`);
    recommendations.push('Update older queries with privacy metadata');
  }

  if (stats.avgPrivacyScore < 90 && stats.queriesWithPrivacyMetadata > 0) {
    recommendations.push(`⚠️ Average privacy score is ${stats.avgPrivacyScore} (target: >90)`);
  }

  if (stats.queriesWithPII > 0) {
    recommendations.push(`⚠️ ${stats.queriesWithPII} queries contain PII`);
    recommendations.push('Implement automated PII removal in data pipeline');
  }

  return recommendations;
}

/**
 * GET /api/privacy/validate
 * Get privacy system status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access privacy status
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const keyValidation = validateEncryptionKey();

    return NextResponse.json({
      success: true,
      status: {
        encryptionEnabled: true,
        anonymizationEnabled: true,
        piiDetectionEnabled: true,
        encryptionKeyValid: keyValidation.isValid,
        encryptionKeyStrength: keyValidation.strength,
      },
      features: {
        queryAnonymization: 'enabled',
        piiRemoval: 'enabled',
        userIdHashing: 'enabled',
        dataEncryption: 'available',
        privacyScoring: 'enabled',
      },
      issues: keyValidation.issues,
    });
  } catch (error: any) {
    console.error("Privacy status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get privacy status" },
      { status: 500 }
    );
  }
}
