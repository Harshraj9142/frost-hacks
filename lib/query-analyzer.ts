/**
 * Query Analysis and Classification System
 * 
 * Analyzes user queries to determine:
 * - Query type (factual, conceptual, numerical, indirect)
 * - Complexity level
 * - Required reasoning type
 * - Optimal retrieval strategy
 */

export type QueryType = 
  | 'factual'        // Direct fact lookup: "What is X?"
  | 'conceptual'     // Understanding: "Why does X behave like this?"
  | 'numerical'      // Math/calculations: "Calculate X"
  | 'procedural'     // How-to: "How do I do X?"
  | 'comparative'    // Comparison: "What's the difference between X and Y?"
  | 'analytical'     // Analysis: "Analyze X"
  | 'indirect';      // Indirect/complex: requires inference

export type ReasoningType =
  | 'retrieval'      // Simple lookup
  | 'synthesis'      // Combine multiple sources
  | 'inference'      // Derive from context
  | 'cross_document' // Link across documents
  | 'multi_hop';     // Multi-step reasoning

export interface QueryAnalysis {
  originalQuery: string;
  queryType: QueryType;
  reasoningType: ReasoningType;
  complexity: 'simple' | 'moderate' | 'complex';
  requiresMultipleSources: boolean;
  requiresCrossDocument: boolean;
  requiresNumericalReasoning: boolean;
  keywords: string[];
  concepts: string[];
  suggestedTopK: number;
  retrievalStrategy: 'standard' | 'expanded' | 'multi_query';
  expandedQueries?: string[];
}

/**
 * Analyze a user query to determine optimal processing strategy
 */
export function analyzeQuery(query: string): QueryAnalysis {
  const lowerQuery = query.toLowerCase();
  
  // Detect query type
  const queryType = detectQueryType(lowerQuery);
  
  // Detect reasoning type
  const reasoningType = detectReasoningType(lowerQuery, queryType);
  
  // Determine complexity
  const complexity = determineComplexity(query, queryType, reasoningType);
  
  // Extract keywords and concepts
  const keywords = extractKeywords(query);
  const concepts = extractConcepts(query);
  
  // Determine if multiple sources needed
  const requiresMultipleSources = 
    reasoningType === 'synthesis' || 
    reasoningType === 'cross_document' ||
    reasoningType === 'multi_hop' ||
    queryType === 'comparative' ||
    queryType === 'analytical';
  
  // Determine if cross-document reasoning needed
  const requiresCrossDocument = 
    reasoningType === 'cross_document' ||
    /across|between|compare.*and|relate.*to|connection between/i.test(query);
  
  // Determine if numerical reasoning needed
  const requiresNumericalReasoning = 
    queryType === 'numerical' ||
    /calculate|compute|solve|formula|equation|number|value/i.test(query);
  
  // Determine optimal topK based on complexity
  const suggestedTopK = requiresMultipleSources ? 12 : complexity === 'complex' ? 10 : 8;
  
  // Determine retrieval strategy
  const retrievalStrategy = determineRetrievalStrategy(queryType, reasoningType, complexity);
  
  // Generate expanded queries for complex queries
  const expandedQueries = retrievalStrategy === 'multi_query' 
    ? generateExpandedQueries(query, queryType, concepts)
    : undefined;
  
  return {
    originalQuery: query,
    queryType,
    reasoningType,
    complexity,
    requiresMultipleSources,
    requiresCrossDocument,
    requiresNumericalReasoning,
    keywords,
    concepts,
    suggestedTopK,
    retrievalStrategy,
    expandedQueries,
  };
}

/**
 * Detect the type of query
 */
function detectQueryType(query: string): QueryType {
  // Numerical queries
  if (/calculate|compute|solve|what is \d+|how much|how many|formula|equation/i.test(query)) {
    return 'numerical';
  }
  
  // Conceptual queries (why, how does it work)
  if (/why does|why is|how does.*work|how does.*behave|explain why|reason for|cause of/i.test(query)) {
    return 'conceptual';
  }
  
  // Comparative queries
  if (/difference between|compare|versus|vs\.|better than|similar to|contrast/i.test(query)) {
    return 'comparative';
  }
  
  // Procedural queries
  if (/how to|how do i|how can i|steps to|process of|procedure for/i.test(query)) {
    return 'procedural';
  }
  
  // Analytical queries
  if (/analyze|evaluate|assess|critique|examine|discuss/i.test(query)) {
    return 'analytical';
  }
  
  // Factual queries (what is, define)
  if (/what is|what are|define|definition of|meaning of|who is|when did/i.test(query)) {
    return 'factual';
  }
  
  // Default to indirect for complex/unclear queries
  return 'indirect';
}

/**
 * Detect the type of reasoning required
 */
function detectReasoningType(query: string, queryType: QueryType): ReasoningType {
  // Cross-document reasoning
  if (/across|between.*and|relate.*to|connection between|link between|in both|in all/i.test(query)) {
    return 'cross_document';
  }
  
  // Multi-hop reasoning (requires multiple steps)
  if (/first.*then|if.*then|based on.*what|given.*find|using.*calculate/i.test(query)) {
    return 'multi_hop';
  }
  
  // Synthesis (combine multiple sources)
  if (queryType === 'comparative' || queryType === 'analytical' || 
      /combine|integrate|synthesize|overall|comprehensive/i.test(query)) {
    return 'synthesis';
  }
  
  // Inference (derive from context)
  if (queryType === 'conceptual' || queryType === 'indirect' ||
      /imply|suggest|indicate|infer|conclude|deduce/i.test(query)) {
    return 'inference';
  }
  
  // Simple retrieval
  return 'retrieval';
}

/**
 * Determine query complexity
 */
function determineComplexity(
  query: string, 
  queryType: QueryType, 
  reasoningType: ReasoningType
): 'simple' | 'moderate' | 'complex' {
  // Complex if multi-hop or cross-document
  if (reasoningType === 'multi_hop' || reasoningType === 'cross_document') {
    return 'complex';
  }
  
  // Complex if analytical or comparative
  if (queryType === 'analytical' || queryType === 'comparative') {
    return 'complex';
  }
  
  // Complex if long query with multiple clauses
  if (query.length > 150 || (query.match(/,/g) || []).length > 2) {
    return 'complex';
  }
  
  // Moderate if conceptual or synthesis
  if (queryType === 'conceptual' || reasoningType === 'synthesis') {
    return 'moderate';
  }
  
  // Simple otherwise
  return 'simple';
}

/**
 * Extract keywords from query
 */
function extractKeywords(query: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'what',
    'which', 'who', 'when', 'where', 'why', 'how'
  ]);
  
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  return [...new Set(words)];
}

/**
 * Extract key concepts from query (noun phrases, technical terms)
 */
function extractConcepts(query: string): string[] {
  const concepts: string[] = [];
  
  // Extract quoted phrases
  const quotedPhrases = query.match(/"([^"]+)"/g);
  if (quotedPhrases) {
    concepts.push(...quotedPhrases.map(p => p.replace(/"/g, '')));
  }
  
  // Extract capitalized terms (likely proper nouns or technical terms)
  const capitalizedTerms = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (capitalizedTerms) {
    concepts.push(...capitalizedTerms);
  }
  
  // Extract technical patterns (e.g., "binary search", "time complexity")
  const technicalPatterns = query.match(/\b[a-z]+\s+(?:algorithm|method|approach|technique|theory|principle|concept|formula|equation)\b/gi);
  if (technicalPatterns) {
    concepts.push(...technicalPatterns);
  }
  
  return [...new Set(concepts)];
}

/**
 * Determine optimal retrieval strategy
 */
function determineRetrievalStrategy(
  queryType: QueryType,
  reasoningType: ReasoningType,
  complexity: 'simple' | 'moderate' | 'complex'
): 'standard' | 'expanded' | 'multi_query' {
  // Multi-query for complex cross-document reasoning
  if (complexity === 'complex' && reasoningType === 'cross_document') {
    return 'multi_query';
  }
  
  // Expanded for moderate complexity
  if (complexity === 'moderate' || reasoningType === 'synthesis') {
    return 'expanded';
  }
  
  // Standard for simple queries
  return 'standard';
}

/**
 * Generate expanded queries for multi-query retrieval
 */
function generateExpandedQueries(
  originalQuery: string,
  queryType: QueryType,
  concepts: string[]
): string[] {
  const expanded: string[] = [originalQuery];
  
  // Add concept-focused queries
  concepts.forEach(concept => {
    expanded.push(`What is ${concept}?`);
    expanded.push(`Explain ${concept}`);
  });
  
  // Add type-specific expansions
  if (queryType === 'conceptual') {
    expanded.push(originalQuery.replace(/why does/i, 'how does'));
    expanded.push(originalQuery.replace(/why/i, 'what causes'));
  }
  
  if (queryType === 'comparative') {
    const parts = originalQuery.match(/between\s+(.+?)\s+and\s+(.+?)[\s?]/i);
    if (parts) {
      expanded.push(`What is ${parts[1]}?`);
      expanded.push(`What is ${parts[2]}?`);
    }
  }
  
  // Limit to 5 expanded queries
  return expanded.slice(0, 5);
}

/**
 * Format query analysis for logging
 */
export function formatQueryAnalysis(analysis: QueryAnalysis): string {
  return `
=== QUERY ANALYSIS ===
Query: ${analysis.originalQuery}
Type: ${analysis.queryType}
Reasoning: ${analysis.reasoningType}
Complexity: ${analysis.complexity}
Multiple Sources: ${analysis.requiresMultipleSources ? 'Yes' : 'No'}
Cross-Document: ${analysis.requiresCrossDocument ? 'Yes' : 'No'}
Numerical: ${analysis.requiresNumericalReasoning ? 'Yes' : 'No'}
Suggested TopK: ${analysis.suggestedTopK}
Strategy: ${analysis.retrievalStrategy}
Keywords: ${analysis.keywords.join(', ')}
Concepts: ${analysis.concepts.join(', ')}
${analysis.expandedQueries ? `Expanded Queries:\n${analysis.expandedQueries.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}` : ''}
`;
}
