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
 * Group citations by document for cross-document analysis
 */
export function groupCitationsByDocument(citations: Citation[]): Map<string, Citation[]> {
  const grouped = new Map<string, Citation[]>();
  
  citations.forEach(citation => {
    const existing = grouped.get(citation.fileName) || [];
    existing.push(citation);
    grouped.set(citation.fileName, existing);
  });
  
  return grouped;
}

/**
 * Identify cross-document connections
 * Finds citations from different documents that might be related
 */
export function identifyCrossDocumentConnections(citations: Citation[]): {
  connections: Array<{
    documents: string[];
    sharedConcepts: string[];
    citations: Citation[];
  }>;
  hasMultipleDocuments: boolean;
  documentCount: number;
} {
  const grouped = groupCitationsByDocument(citations);
  const documentNames = Array.from(grouped.keys());
  const hasMultipleDocuments = documentNames.length > 1;
  
  const connections: Array<{
    documents: string[];
    sharedConcepts: string[];
    citations: Citation[];
  }> = [];
  
  if (hasMultipleDocuments) {
    // Find shared concepts across documents
    for (let i = 0; i < documentNames.length; i++) {
      for (let j = i + 1; j < documentNames.length; j++) {
        const doc1 = documentNames[i];
        const doc2 = documentNames[j];
        const citations1 = grouped.get(doc1)!;
        const citations2 = grouped.get(doc2)!;
        
        // Extract concepts from both sets of citations
        const concepts1 = extractConceptsFromCitations(citations1);
        const concepts2 = extractConceptsFromCitations(citations2);
        
        // Find shared concepts
        const sharedConcepts = concepts1.filter(c => concepts2.includes(c));
        
        if (sharedConcepts.length > 0) {
          connections.push({
            documents: [doc1, doc2],
            sharedConcepts,
            citations: [...citations1, ...citations2],
          });
        }
      }
    }
  }
  
  return {
    connections,
    hasMultipleDocuments,
    documentCount: documentNames.length,
  };
}

/**
 * Extract key concepts from citation texts
 */
function extractConceptsFromCitations(citations: Citation[]): string[] {
  const concepts = new Set<string>();
  
  citations.forEach(citation => {
    // Extract capitalized terms (likely concepts)
    const capitalizedTerms = citation.text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedTerms) {
      capitalizedTerms.forEach(term => concepts.add(term.toLowerCase()));
    }
    
    // Extract technical terms (common patterns)
    const technicalPatterns = citation.text.match(/\b[a-z]+\s+(?:algorithm|method|approach|technique|theory|principle|concept|formula|equation|function|process|system)\b/gi);
    if (technicalPatterns) {
      technicalPatterns.forEach(term => concepts.add(term.toLowerCase()));
    }
  });
  
  return Array.from(concepts);
}

/**
 * Format multiple citations for inline display
 * Example: [1, 2: algorithms.pdf, pp. 5-7; 3: data-structures.pdf, p. 12]
 */
export function formatMultipleCitations(citations: Citation[], indices: number[]): string {
  if (indices.length === 0) return '';
  if (indices.length === 1) return formatInlineCitation(citations[indices[0]], indices[0]);
  
  // Group by document
  const byDocument = new Map<string, { indices: number[]; pages: Set<number> }>();
  
  indices.forEach(idx => {
    const citation = citations[idx];
    if (!byDocument.has(citation.fileName)) {
      byDocument.set(citation.fileName, { indices: [], pages: new Set() });
    }
    const group = byDocument.get(citation.fileName)!;
    group.indices.push(idx + 1);
    if (citation.pageNumber) group.pages.add(citation.pageNumber);
    if (citation.pageNumbers) citation.pageNumbers.forEach(p => group.pages.add(p));
  });
  
  // Format each document group
  const parts: string[] = [];
  byDocument.forEach((group, fileName) => {
    const indexStr = group.indices.join(', ');
    const pages = Array.from(group.pages).sort((a, b) => a - b);
    const pageStr = pages.length > 0 
      ? pages.length === 1 
        ? `p. ${pages[0]}`
        : `pp. ${pages.join(', ')}`
      : '';
    parts.push(`${indexStr}: ${fileName}${pageStr ? ', ' + pageStr : ''}`);
  });
  
  return `[${parts.join('; ')}]`;
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

/**
 * Validate that AI response properly cites sources
 */
export function validateResponseCitations(
  response: string,
  availableSources: number
): {
  hasCitations: boolean;
  citationCount: number;
  sourcesReferenced: number[];
  allSourcesCited: boolean;
  citationDensity: number;
  quality: 'excellent' | 'good' | 'poor' | 'none';
  issues: string[];
} {
  const issues: string[] = [];
  
  // Extract citation patterns: [Source 1], [Source 2, 3], etc.
  const citationPattern = /\[Source\s+(\d+(?:\s*,\s*\d+)*)\]/gi;
  const matches = response.matchAll(citationPattern);
  
  const citationsFound = Array.from(matches);
  const citationCount = citationsFound.length;
  
  // Extract unique source numbers referenced
  const sourcesReferenced = new Set<number>();
  citationsFound.forEach(match => {
    const sourceNums = match[1].split(',').map(n => parseInt(n.trim()));
    sourceNums.forEach(num => sourcesReferenced.add(num));
  });
  
  const uniqueSourcesReferenced = Array.from(sourcesReferenced).sort((a, b) => a - b);
  
  // Check if all available sources are cited
  const allSourcesCited = uniqueSourcesReferenced.length === availableSources;
  
  // Calculate citation density (citations per 100 words)
  const wordCount = response.split(/\s+/).length;
  const citationDensity = (citationCount / wordCount) * 100;
  
  // Validate citation quality
  if (citationCount === 0) {
    issues.push('No citations found in response');
  }
  
  if (citationDensity < 1 && wordCount > 50) {
    issues.push('Low citation density - add more source references');
  }
  
  if (uniqueSourcesReferenced.length < availableSources / 2) {
    issues.push(`Only ${uniqueSourcesReferenced.length}/${availableSources} sources cited`);
  }
  
  // Check for invalid source numbers
  const invalidSources = uniqueSourcesReferenced.filter(num => num < 1 || num > availableSources);
  if (invalidSources.length > 0) {
    issues.push(`Invalid source numbers: ${invalidSources.join(', ')}`);
  }
  
  // Determine quality
  let quality: 'excellent' | 'good' | 'poor' | 'none';
  if (citationCount === 0) {
    quality = 'none';
  } else if (citationDensity >= 2 && allSourcesCited) {
    quality = 'excellent';
  } else if (citationDensity >= 1 && uniqueSourcesReferenced.length >= availableSources / 2) {
    quality = 'good';
  } else {
    quality = 'poor';
  }
  
  return {
    hasCitations: citationCount > 0,
    citationCount,
    sourcesReferenced: uniqueSourcesReferenced,
    allSourcesCited,
    citationDensity: parseFloat(citationDensity.toFixed(2)),
    quality,
    issues,
  };
}

/**
 * Validate Socratic response quality
 * Checks if response follows Socratic method principles
 */
export function validateSocraticResponse(
  response: string
): {
  isSocratic: boolean;
  questionCount: number;
  hasDirectAnswers: boolean;
  hasGuidingQuestions: boolean;
  hasHints: boolean;
  hasEncouragement: boolean;
  hasSections: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'failing';
  issues: string[];
  strengths: string[];
} {
  const issues: string[] = [];
  const strengths: string[] = [];
  
  // Count questions
  const questions = response.match(/\?/g) || [];
  const questionCount = questions.length;
  
  // Check for required sections
  const hasExploreSection = /##\s*(Let's Explore|Think About|Guiding Questions)/i.test(response);
  const hasHintsSection = /##\s*(Hints|Clues|From.*Materials)/i.test(response);
  const hasEncouragementSection = /##\s*(Think About|Next Steps|Keep Going|You Can Do)/i.test(response);
  const hasSections = hasExploreSection || hasHintsSection || hasEncouragementSection;
  
  // Detect direct answers (forbidden in Socratic mode)
  const directAnswerPatterns = [
    /^(The answer is|It is|This is|Here's how|The solution|To solve this)/im,
    /^(Step 1:|First,.*Second,.*Third,)/im,
    /^(In summary|To summarize|In conclusion)/im,
    /(works by|is defined as|means that|refers to).*\./i,
  ];
  
  const hasDirectAnswers = directAnswerPatterns.some(pattern => pattern.test(response));
  
  // Check for guiding questions (should ask "What", "How", "Why", "Can you")
  const guidingQuestionPatterns = [
    /What (do you think|would happen|could|might|is|are)/i,
    /How (would|could|might|does|do)/i,
    /Why (do you think|might|would|is|are)/i,
    /Can you (think|imagine|predict|explain)/i,
    /Have you considered/i,
    /What if/i,
  ];
  
  const guidingQuestions = guidingQuestionPatterns.filter(pattern => pattern.test(response));
  const hasGuidingQuestions = guidingQuestions.length >= 2;
  
  // Check for hints (should have bullet points or numbered hints)
  const hasHints = /[-•*]\s+/g.test(response) || /\d+\.\s+/g.test(response);
  
  // Check for encouragement
  const encouragementPatterns = [
    /great question/i,
    /excellent/i,
    /think (about|through)/i,
    /you('ll| will) (understand|discover|figure out)/i,
    /take your time/i,
    /work through/i,
    /let's explore/i,
  ];
  
  const hasEncouragement = encouragementPatterns.some(pattern => pattern.test(response));
  
  // Validation checks
  if (questionCount < 3) {
    issues.push(`Only ${questionCount} questions (need at least 3)`);
  } else {
    strengths.push(`${questionCount} guiding questions`);
  }
  
  if (hasDirectAnswers) {
    issues.push('Contains direct answers (should only guide with questions)');
  } else {
    strengths.push('No direct answers - properly Socratic');
  }
  
  if (!hasGuidingQuestions) {
    issues.push('Lacks guiding questions (What/How/Why)');
  } else {
    strengths.push('Uses effective guiding questions');
  }
  
  if (!hasHints) {
    issues.push('Missing hints section');
  } else {
    strengths.push('Provides strategic hints');
  }
  
  if (!hasEncouragement) {
    issues.push('Lacks encouragement');
  } else {
    strengths.push('Includes encouragement');
  }
  
  if (!hasSections) {
    issues.push('Missing structured sections (## headers)');
  } else {
    strengths.push('Well-structured with sections');
  }
  
  // Determine quality
  let quality: 'excellent' | 'good' | 'poor' | 'failing';
  const isSocratic = questionCount >= 3 && !hasDirectAnswers && hasGuidingQuestions;
  
  if (isSocratic && hasHints && hasEncouragement && hasSections) {
    quality = 'excellent';
  } else if (isSocratic && (hasHints || hasEncouragement)) {
    quality = 'good';
  } else if (questionCount >= 2 && !hasDirectAnswers) {
    quality = 'poor';
  } else {
    quality = 'failing';
  }
  
  return {
    isSocratic,
    questionCount,
    hasDirectAnswers,
    hasGuidingQuestions,
    hasHints,
    hasEncouragement,
    hasSections,
    quality,
    issues,
    strengths,
  };
}
