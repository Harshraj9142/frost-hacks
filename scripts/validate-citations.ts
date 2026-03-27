/**
 * Citation Validation Script
 * 
 * Run this script to validate citation accuracy across your RAG system.
 * It checks 20 random responses and validates their citations against actual documents.
 * 
 * Usage: npx tsx scripts/validate-citations.ts
 */

import connectDB from "@/lib/mongodb";
import QueryLog from "@/models/QueryLog";
import Document from "@/models/Document";
import { validateCitation, generateCitationReport, validateResponseCitations, type Citation } from "@/lib/citations";
import { queryVectors } from "@/lib/vector-store";

interface ValidationResult {
  queryId: string;
  query: string;
  response: string;
  courseId: string;
  totalCitations: number;
  validCitations: number;
  invalidCitations: number;
  averageRelevance: number;
  citationQuality: 'excellent' | 'good' | 'poor' | 'none';
  citationDensity: number;
  sourcesReferenced: number[];
  allSourcesCited: boolean;
  issues: string[];
  citationReport: string;
  documentsUsed: string[];
  pagesCited: number[];
}

async function validateCitations() {
  console.log("🔍 Starting Citation Validation...\n");
  console.log("This will validate 20 random responses against actual course documents.\n");
  
  try {
    await connectDB();
    
    // Fetch 20 random queries with responses
    const queries = await QueryLog.find({
      response: { $exists: true, $ne: "" },
      courseId: { $exists: true }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    console.log(`📊 Found ${queries.length} queries to validate\n`);
    
    if (queries.length === 0) {
      console.log("⚠️  No queries found. Make sure you have chat history in the database.");
      process.exit(0);
    }
    
    const results: ValidationResult[] = [];
    let totalCitations = 0;
    let totalValid = 0;
    let totalInvalid = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let poorCount = 0;
    let noneCount = 0;
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`\n${"=".repeat(80)}`);
      console.log(`[${i + 1}/${queries.length}] Query: ${query.query.substring(0, 60)}...`);
      console.log(`${"=".repeat(80)}\n`);
      
      try {
        // Re-query vectors to get actual citations that should have been used
        const relevantDocs = await queryVectors(query.query, query.courseId, 5);
        
        if (relevantDocs.length === 0) {
          console.log("⚠️  No relevant documents found for this query\n");
          continue;
        }
        
        // Create citations from retrieved documents
        const citations: Citation[] = relevantDocs.map((doc, index) => ({
          id: `cite-${Date.now()}-${index}`,
          fileName: doc.metadata.fileName,
          fileType: doc.metadata.fileType,
          pageNumber: doc.metadata.pageNumber,
          pageNumbers: doc.metadata.pageNumbers 
            ? (typeof doc.metadata.pageNumbers === 'string' 
                ? doc.metadata.pageNumbers.split(',').map((n: string) => parseInt(n.trim()))
                : doc.metadata.pageNumbers)
            : undefined,
          chunkIndex: doc.metadata.chunkIndex,
          text: doc.text.substring(0, 200),
          fullText: doc.text,
          relevanceScore: doc.score,
          timestamp: new Date().toISOString(),
        }));
        
        // Validate each citation's metadata
        const validationResults = citations.map(citation => ({
          citation,
          validation: validateCitation(citation)
        }));
        
        const validCount = validationResults.filter(r => r.validation.isValid).length;
        const invalidCount = citations.length - validCount;
        
        totalCitations += citations.length;
        totalValid += validCount;
        totalInvalid += invalidCount;
        
        // Validate response citations (check if AI actually cited sources)
        const responseCitationValidation = validateResponseCitations(
          query.response,
          citations.length
        );
        
        // Track quality
        if (responseCitationValidation.quality === 'excellent') excellentCount++;
        else if (responseCitationValidation.quality === 'good') goodCount++;
        else if (responseCitationValidation.quality === 'poor') poorCount++;
        else noneCount++;
        
        // Generate citation report
        const citationReport = generateCitationReport(citations);
        
        // Collect issues
        const metadataIssues = validationResults
          .filter(r => !r.validation.isValid)
          .flatMap(r => r.validation.issues);
        
        const responseIssues = responseCitationValidation.issues;
        const allIssues = [...metadataIssues, ...responseIssues];
        
        // Get unique pages cited
        const pagesCited: number[] = [];
        citations.forEach(c => {
          if (c.pageNumber) pagesCited.push(c.pageNumber);
          if (c.pageNumbers) pagesCited.push(...c.pageNumbers);
        });
        const uniquePages = [...new Set(pagesCited)].sort((a, b) => a - b);
        
        const result: ValidationResult = {
          queryId: query._id.toString(),
          query: query.query,
          response: query.response.substring(0, 200) + '...',
          courseId: query.courseId,
          totalCitations: citations.length,
          validCitations: validCount,
          invalidCitations: invalidCount,
          averageRelevance: citations.reduce((sum, c) => sum + c.relevanceScore, 0) / citations.length,
          citationQuality: responseCitationValidation.quality,
          citationDensity: responseCitationValidation.citationDensity,
          sourcesReferenced: responseCitationValidation.sourcesReferenced,
          allSourcesCited: responseCitationValidation.allSourcesCited,
          issues: allIssues,
          citationReport,
          documentsUsed: [...new Set(citations.map(c => c.fileName))],
          pagesCited: uniquePages,
        };
        
        results.push(result);
        
        // Print summary for this query
        console.log(`📋 Available Citations: ${result.totalCitations}`);
        console.log(`✅ Valid Metadata: ${result.validCitations}`);
        console.log(`❌ Invalid Metadata: ${result.invalidCitations}`);
        console.log(`📊 Avg Relevance: ${(result.averageRelevance * 100).toFixed(1)}%`);
        console.log(`\n📝 Response Citation Analysis:`);
        console.log(`   Quality: ${responseCitationValidation.quality.toUpperCase()}`);
        console.log(`   Citations in Response: ${responseCitationValidation.citationCount}`);
        console.log(`   Sources Referenced: [${responseCitationValidation.sourcesReferenced.join(', ')}]`);
        console.log(`   Citation Density: ${responseCitationValidation.citationDensity.toFixed(2)} per 100 words`);
        console.log(`   All Sources Cited: ${responseCitationValidation.allSourcesCited ? 'Yes ✓' : 'No ✗'}`);
        console.log(`\n📄 Documents Used: ${result.documentsUsed.join(', ')}`);
        console.log(`📖 Pages Cited: ${result.pagesCited.length > 0 ? result.pagesCited.join(', ') : 'N/A (text files)'}`);
        
        if (allIssues.length > 0) {
          console.log(`\n⚠️  Issues Found:`);
          allIssues.forEach(issue => console.log(`   - ${issue}`));
        }
        
        // Show excerpt of response with citations highlighted
        const responseExcerpt = query.response.substring(0, 300);
        const hasCitations = /\[Source\s+\d+\]/.test(responseExcerpt);
        console.log(`\n📄 Response Excerpt:`);
        console.log(`   "${responseExcerpt}..."`);
        console.log(`   ${hasCitations ? '✓ Contains citations' : '✗ No citations found'}`);
        
      } catch (error: any) {
        console.error(`❌ Error validating query ${query._id}:`, error.message);
      }
    }
    
    // Print overall summary
    console.log("\n\n" + "=".repeat(80));
    console.log("📊 OVERALL VALIDATION SUMMARY");
    console.log("=".repeat(80) + "\n");
    
    console.log(`Total Queries Analyzed: ${results.length}`);
    console.log(`Total Citations Available: ${totalCitations}`);
    console.log(`Valid Citation Metadata: ${totalValid} (${((totalValid / totalCitations) * 100).toFixed(1)}%)`);
    console.log(`Invalid Citation Metadata: ${totalInvalid} (${((totalInvalid / totalCitations) * 100).toFixed(1)}%)`);
    
    const avgRelevance = results.reduce((sum, r) => sum + r.averageRelevance, 0) / results.length;
    console.log(`Average Relevance Score: ${(avgRelevance * 100).toFixed(1)}%`);
    
    const avgCitationDensity = results.reduce((sum, r) => sum + r.citationDensity, 0) / results.length;
    console.log(`Average Citation Density: ${avgCitationDensity.toFixed(2)} per 100 words`);
    
    console.log(`\n📊 Citation Quality Distribution:`);
    console.log(`   Excellent: ${excellentCount} (${((excellentCount / results.length) * 100).toFixed(0)}%)`);
    console.log(`   Good: ${goodCount} (${((goodCount / results.length) * 100).toFixed(0)}%)`);
    console.log(`   Poor: ${poorCount} (${((poorCount / results.length) * 100).toFixed(0)}%)`);
    console.log(`   None: ${noneCount} (${((noneCount / results.length) * 100).toFixed(0)}%)`);
    
    // Group issues by type
    const allIssues = results.flatMap(r => r.issues);
    const issueGroups = allIssues.reduce((acc, issue) => {
      acc[issue] = (acc[issue] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    if (Object.keys(issueGroups).length > 0) {
      console.log("\n⚠️  Common Issues:");
      Object.entries(issueGroups)
        .sort(([, a], [, b]) => b - a)
        .forEach(([issue, count]) => {
          console.log(`   ${count}x - ${issue}`);
        });
    }
    
    // Document and page statistics
    const allDocs = results.flatMap(r => r.documentsUsed);
    const uniqueDocs = new Set(allDocs);
    const allPages = results.flatMap(r => r.pagesCited);
    const uniquePages = new Set(allPages);
    
    console.log(`\n📚 Document Statistics:`);
    console.log(`   Unique Documents Cited: ${uniqueDocs.size}`);
    console.log(`   Total Document References: ${allDocs.length}`);
    console.log(`   Unique Pages Cited: ${uniquePages.size}`);
    console.log(`   Total Page References: ${allPages.length}`);
    
    // Recommendations
    console.log("\n💡 Recommendations:");
    
    if (noneCount > results.length * 0.3) {
      console.log("   🔴 CRITICAL: >30% of responses have NO citations");
      console.log("      → Update AI prompt to enforce citation requirements");
    }
    
    if (poorCount > results.length * 0.2) {
      console.log("   ⚠️  WARNING: >20% of responses have poor citation quality");
      console.log("      → Increase citation density threshold in prompt");
    }
    
    if (totalInvalid > 0) {
      console.log("   ⚠️  Fix invalid citation metadata (page numbers, file names)");
    }
    
    if (avgRelevance < 0.75) {
      console.log("   ⚠️  Consider increasing relevance threshold for better quality");
    }
    
    if (avgCitationDensity < 1.5) {
      console.log("   ⚠️  Low citation density - encourage more frequent source references");
    }
    
    const allSourcesCitedCount = results.filter(r => r.allSourcesCited).length;
    if (allSourcesCitedCount < results.length * 0.5) {
      console.log("   ⚠️  <50% of responses cite all available sources");
      console.log("      → Encourage AI to use diverse sources in responses");
    }
    
    if (excellentCount > results.length * 0.7) {
      console.log("   ✅ EXCELLENT: >70% of responses have excellent citation quality!");
    }
    
    console.log("\n✅ Validation Complete!\n");
    
    // Save detailed report to file
    const fs = await import('fs');
    const reportPath = './citation-validation-report.txt';
    const reportContent = [
      '='.repeat(80),
      'CITATION VALIDATION REPORT',
      `Generated: ${new Date().toISOString()}`,
      '='.repeat(80),
      '',
      `Total Queries: ${results.length}`,
      `Total Citations: ${totalCitations}`,
      `Valid Metadata: ${totalValid} (${((totalValid / totalCitations) * 100).toFixed(1)}%)`,
      `Average Relevance: ${(avgRelevance * 100).toFixed(1)}%`,
      `Average Citation Density: ${avgCitationDensity.toFixed(2)}`,
      '',
      'Quality Distribution:',
      `  Excellent: ${excellentCount}`,
      `  Good: ${goodCount}`,
      `  Poor: ${poorCount}`,
      `  None: ${noneCount}`,
      '',
      '='.repeat(80),
      'DETAILED RESULTS',
      '='.repeat(80),
      '',
      ...results.map((r, i) => [
        `[${i + 1}] Query: ${r.query}`,
        `    Response: ${r.response}`,
        `    Quality: ${r.citationQuality}`,
        `    Citations: ${r.totalCitations} (${r.sourcesReferenced.join(', ')})`,
        `    Documents: ${r.documentsUsed.join(', ')}`,
        `    Pages: ${r.pagesCited.join(', ') || 'N/A'}`,
        `    Issues: ${r.issues.length > 0 ? r.issues.join('; ') : 'None'}`,
        '',
      ].join('\n')),
    ].join('\n');
    
    fs.writeFileSync(reportPath, reportContent);
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);
    
  } catch (error) {
    console.error("❌ Validation Error:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run validation
validateCitations();
