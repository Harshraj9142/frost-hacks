/**
 * Citation System for RAG Responses
 * 
 * Provides structured citations with page numbers, file names,
 * and validation mechanisms to ensure accuracy.
 */

export interface Citation {
  id: string;                    // Unique citation ID
  fileName: string;              // Source document name
  fileType: string;              // PDF, TXT, etc.
  pageNumber?: number;           // Single page number
  pageNumbers?: number[];        // Multiple pages if spans
  chunkIndex: number;            // Chunk position in document
  text: string;                  // Excerpt from source (max 200 chars)
  fullText: string;              // Complete chunk text
  relevanceScore: number;        // Similarity score (0-1)
  timestamp: string;             // When cited
}

export interface CitationGroup {
  highly_relevant: Citation[];   // Score >= 0.80
  relevant: Citation[];          // Score 0.70-0.79
  supporting: Citation[];        // Score 0.60-0.69
}

export interface StructuredResponse {
  response: string;              // AI-generated response
  citations: Citation[];         // All citations used
  citationGroups: CitationGroup; // Organized by relevance
  metadata: {
    totalCitations: number;
    uniqueDocuments: number;
    averageRelevance: number;
    pagesCited: number[];        // All unique pages cited
    hasCitations: boolean;
  };
}

/**
 * Create a citation from vector search result
 */
export function createCitation(
  result: any,
  index: number
): Citation {
  // Parse pageNumbers from string format if needed
  const pageNumbers = result.metadata.pageNumbers 
    ? (typeof result.metadata.pageNumbers === 'string' 
        ? result.metadata.pageNumbers.split(',').map((n: string) => parseInt(n.trim()))
        : result.metadata.pageNumbers)
    : undefined;
  
  const pageInfo = formatPageInfo(result.metadata.pageNumber, pageNumbers);
  
  return {
    id: `cite-${Date.now()}-${index}`,
    fileName: result.metadata.fileName,
    fileType: result.metadata.fileType,
    pageNumber: result.metadata.pageNumber,
    pageNumbers: pageNumbers,
    chunkIndex: result.metadata.chunkIndex,
    text: truncateText(result.text, 200),
    fullText: result.text,
    relevanceScore: result.score,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Group citations by relevance
 */
export function groupCitations(citations: Citation[]): CitationGroup {
  return {
    highly_relevant: citations.filter(c => c.relevanceScore >= 0.80),
    relevant: citations.filter(c => c.relevanceScore >= 0.70 && c.relevanceScore < 0.80),
    supporting: citations.filter(c => c.relevanceScore >= 0.60 && c.relevanceScore < 0.70),
  };
}

/**
 * Format page information for display
 */
export function formatPageInfo(
  pageNumber?: number,
  pageNumbers?: number[]
): string {
  if (pageNumber) {
    return `p. ${pageNumber}`;
  } else if (pageNumbers && pageNumbers.length > 0) {
    if (pageNumbers.length === 2) {
      return `pp. ${pageNumbers[0]}-${pageNumbers[1]}`;
    } else {
      return `pp. ${pageNumbers.join(', ')}`;
    }
  }
  return '';
}

/**
 * Format citation for inline display
 * Example: [1: algorithms.pdf, p. 5]
 */
export function formatInlineCitation(citation: Citation, index: number): string {
  const pageInfo = formatPageInfo(citation.pageNumber, citation.pageNumbers);
  return `[${index + 1}: ${citation.fileName}${pageInfo ? ', ' + pageInfo : ''}]`;
}

/**
 * Format citation for bibliography
 */
export function formatBibliographyCitation(citation: Citation, index: number): string {
  const pageInfo = formatPageInfo(citation.pageNumber, citation.pageNumbers);
  const relevance = `(${(citation.relevanceScore * 100).toFixed(0)}% relevant)`;
  
  return `[${index + 1}] ${citation.fileName}${pageInfo ? ', ' + pageInfo : ''} ${relevance}
Excerpt: "${citation.text}"`;
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Validate citation accuracy
 * Checks if the citation text actually appears in the source
 */
export function validateCitation(citation: Citation): {
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check if text is not empty
  if (!citation.text || citation.text.trim().length === 0) {
    issues.push('Citation text is empty');
  }
  
  // Check if page number is reasonable
  if (citation.pageNumber && citation.pageNumber < 1) {
    issues.push('Invalid page number');
  }
  
  // Check if relevance score is reasonable
  if (citation.relevanceScore < 0.60) {
    issues.push('Low relevance score');
  }
  
  // Check if file name exists
  if (!citation.fileName) {
    issues.push('Missing file name');
  }
  
  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (issues.length > 0) {
    confidence = 'low';
  } else if (citation.relevanceScore < 0.75) {
    confidence = 'medium';
  }
  
  return {
    isValid: issues.length === 0,
    confidence,
    issues,
  };
}

/**
 * Get unique pages cited across all citations
 */
export function getUniquePagesCited(citations: Citation[]): number[] {
  const pages = new Set<number>();
  
  citations.forEach(citation => {
    if (citation.pageNumber) {
      pages.add(citation.pageNumber);
    }
    if (citation.pageNumbers) {
      citation.pageNumbers.forEach(p => pages.add(p));
    }
  });
  
  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Get unique documents cited
 */
export function getUniqueDocuments(citations: Citation[]): string[] {
  const docs = new Set<string>();
  citations.forEach(c => docs.add(c.fileName));
  return Array.from(docs);
}

/**
 * Calculate average relevance score
 */
export function calculateAverageRelevance(citations: Citation[]): number {
  if (citations.length === 0) return 0;
  const sum = citations.reduce((acc, c) => acc + c.relevanceScore, 0);
  return sum / citations.length;
}

/**
 * Create structured response with citations
 */
export function createStructuredResponse(
  response: string,
  citations: Citation[]
): StructuredResponse {
  const citationGroups = groupCitations(citations);
  
  return {
    response,
    citations,
    citationGroups,
    metadata: {
      totalCitations: citations.length,
      uniqueDocuments: getUniqueDocuments(citations).length,
      averageRelevance: calculateAverageRelevance(citations),
      pagesCited: getUniquePagesCited(citations),
      hasCitations: citations.length > 0,
    },
  };
}

/**
 * Format citations for display in UI
 */
export function formatCitationsForUI(citations: Citation[]): any[] {
  return citations.map((citation, index) => ({
    id: citation.id,
    index: index + 1,
    fileName: citation.fileName,
    pageInfo: formatPageInfo(citation.pageNumber, citation.pageNumbers),
    excerpt: citation.text,
    relevance: citation.relevanceScore,
    relevancePercent: `${(citation.relevanceScore * 100).toFixed(0)}%`,
    chunkIndex: citation.chunkIndex,
  }));
}

/**
 * Generate citation report for validation
 */
export function generateCitationReport(citations: Citation[]): string {
  const report: string[] = [];
  
  report.push('=== CITATION VALIDATION REPORT ===\n');
  report.push(`Total Citations: ${citations.length}`);
  report.push(`Unique Documents: ${getUniqueDocuments(citations).length}`);
  report.push(`Average Relevance: ${(calculateAverageRelevance(citations) * 100).toFixed(1)}%`);
  report.push(`Pages Cited: ${getUniquePagesCited(citations).join(', ')}\n`);
  
  report.push('=== INDIVIDUAL CITATIONS ===\n');
  
  citations.forEach((citation, index) => {
    const validation = validateCitation(citation);
    report.push(`[${index + 1}] ${citation.fileName}`);
    report.push(`    Page: ${formatPageInfo(citation.pageNumber, citation.pageNumbers)}`);
    report.push(`    Relevance: ${(citation.relevanceScore * 100).toFixed(1)}%`);
    report.push(`    Valid: ${validation.isValid ? 'Yes' : 'No'} (${validation.confidence} confidence)`);
    if (validation.issues.length > 0) {
      report.push(`    Issues: ${validation.issues.join(', ')}`);
    }
    report.push(`    Excerpt: "${citation.text}"\n`);
  });
  
  return report.join('\n');
}
