import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryVectors, queryVectorsMulti } from "@/lib/vector-store";
import Groq from "groq-sdk";
import {
  createCitation,
  createStructuredResponse,
  formatInlineCitation,
  formatBibliographyCitation,
  generateCitationReport,
  validateResponseCitations,
  validateSocraticResponse,
  identifyCrossDocumentConnections,
  formatMultipleCitations,
  type Citation,
} from "@/lib/citations";
import {
  secureDataForStorage,
  detectAndRemovePII,
  generatePrivacyReport,
} from "@/lib/privacy";
import {
  analyzeQuery,
  formatQueryAnalysis,
  type QueryAnalysis,
} from "@/lib/query-analyzer";
import connectDB from "@/lib/mongodb";
import StudentActivity from "@/models/StudentActivity";
import QueryLog from "@/models/QueryLog";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Get query-specific guidance for the AI based on query analysis
 */
function getQueryTypeGuidance(analysis: QueryAnalysis): string {
  const guidance: string[] = [];
  
  guidance.push(`QUERY TYPE: ${analysis.queryType.toUpperCase()}`);
  guidance.push(`REASONING REQUIRED: ${analysis.reasoningType.toUpperCase()}`);
  guidance.push(`COMPLEXITY: ${analysis.complexity.toUpperCase()}\n`);
  
  if (analysis.queryType === 'conceptual') {
    guidance.push(`CONCEPTUAL QUERY GUIDANCE:
- Focus on explaining WHY and HOW things work
- Break down the underlying principles
- Use examples from the materials to illustrate concepts
- Connect abstract ideas to concrete examples
- Explain cause-and-effect relationships`);
  }
  
  if (analysis.queryType === 'numerical') {
    guidance.push(`NUMERICAL QUERY GUIDANCE:
- Show step-by-step calculations if formulas are in the materials
- Explain the reasoning behind each step
- Reference the specific formula or method from the sources
- Verify units and values match the source materials
- If the exact calculation isn't in materials, explain what IS available`);
  }
  
  if (analysis.queryType === 'comparative') {
    guidance.push(`COMPARATIVE QUERY GUIDANCE:
- Create a clear comparison structure
- Identify similarities AND differences
- Use information from multiple sources if available
- Organize comparison by key dimensions
- Conclude with when to use each option (if materials provide this)`);
  }
  
  if (analysis.queryType === 'indirect') {
    guidance.push(`INDIRECT/COMPLEX QUERY GUIDANCE:
- Break down the question into components
- Address each component using available materials
- Make logical connections between concepts
- Be explicit about what can be inferred vs. what is directly stated
- If the query requires information not in materials, acknowledge this clearly`);
  }
  
  if (analysis.requiresCrossDocument) {
    guidance.push(`CROSS-DOCUMENT REASONING REQUIRED:
- You have information from MULTIPLE documents
- Explicitly connect concepts across different sources
- Show how information from one document relates to another
- Build a coherent narrative that synthesizes multiple sources
- Example: "Source 1 introduces concept X, which Source 3 applies to scenario Y"
- Cite all relevant sources when making connections`);
  }
  
  if (analysis.requiresMultipleSources) {
    guidance.push(`MULTIPLE SOURCES REQUIRED:
- This query requires synthesizing information from multiple sources
- Cite each source when using its information
- Show how different sources complement each other
- Create a unified answer that integrates all relevant sources`);
  }
  
  return guidance.join('\n\n');
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { message, courseId, conversationHistory, focusedDocumentId, tutorMode } = await req.json();

    console.log("Chat request received:", {
      messageLength: message?.length,
      courseId,
      focusedDocumentId,
      hasFocus: !!focusedDocumentId,
    });

    if (!message || !courseId) {
      return NextResponse.json(
        { error: "Message and courseId are required" },
        { status: 400 }
      );
    }

    // Privacy check: Detect PII in user query
    const piiCheck = detectAndRemovePII(message);
    if (piiCheck.hasPII) {
      console.warn("PII detected in query:", piiCheck.piiDetected);
      // Use cleaned query for processing
      const cleanedMessage = piiCheck.cleanedText;
      console.log("Query sanitized, PII removed:", piiCheck.piiDetected);
    }

    // STEP 1: Analyze the query to determine optimal processing strategy
    const queryAnalysis = analyzeQuery(message);
    console.log(formatQueryAnalysis(queryAnalysis));

    // STEP 2: Query relevant documents using appropriate strategy
    let relevantDocs;
    
    if (queryAnalysis.retrievalStrategy === 'multi_query' && queryAnalysis.expandedQueries) {
      console.log("Using multi-query retrieval for complex query");
      // Use multi-query retrieval for complex queries
      relevantDocs = await queryVectorsMulti(
        queryAnalysis.expandedQueries,
        courseId,
        queryAnalysis.suggestedTopK,
        focusedDocumentId
      );
    } else if (focusedDocumentId) {
      console.log("Querying with document focus:", focusedDocumentId);
      // If focused on a specific document, retrieve more chunks for better coverage
      relevantDocs = await queryVectors(
        message, 
        courseId, 
        queryAnalysis.suggestedTopK, 
        focusedDocumentId
      );
      console.log("Focused query returned:", relevantDocs.length, "results");
    } else {
      console.log("Querying all documents in course");
      // Query all documents in the course
      relevantDocs = await queryVectors(
        message, 
        courseId, 
        queryAnalysis.suggestedTopK
      );
      console.log("General query returned:", relevantDocs.length, "results");
    }

    if (relevantDocs.length === 0) {
      const focusMessage = focusedDocumentId 
        ? "I don't have information about that in the focused document. Try asking about a different topic from this document, or remove the document focus to search all course materials."
        : "I don't have any course materials uploaded yet for this topic. Here's what you can do:\n\n1. Ask your instructor to upload relevant documents\n2. Try asking about a different topic that might be covered\n3. Rephrase your question to be more specific\n\nWhat else would you like to explore?";
      
      return NextResponse.json({
        response: focusMessage,
        sources: [],
        noContext: true,
        isOutOfScope: true,
        scopeReason: "no_documents",
        focusedDocument: focusedDocumentId || null,
      });
    }

    // Enhanced out-of-scope detection with tightened thresholds
    const RELEVANCE_THRESHOLDS = {
      HIGH_QUALITY: 0.65,      // Strong match - definitely in scope
      ACCEPTABLE: 0.55,        // Acceptable match - likely in scope (raised from 0.50)
      OUT_OF_SCOPE: 0.45,      // Below this - definitely out of scope (raised from 0.40)
      AVG_TOP3_MIN: 0.50,      // Average of top 3 must exceed this
    };

    const bestScore = relevantDocs[0]?.score || 0;
    const top3Scores = relevantDocs.slice(0, 3).map(doc => doc.score);
    const avgTop3 = top3Scores.length > 0 
      ? top3Scores.reduce((sum, s) => sum + s, 0) / top3Scores.length 
      : 0;
    const highQualityDocs = relevantDocs.filter(doc => doc.score >= RELEVANCE_THRESHOLDS.ACCEPTABLE);
    const hasStrongMatch = relevantDocs.some(doc => doc.score >= RELEVANCE_THRESHOLDS.HIGH_QUALITY);
    
    console.log("Relevance scores:", {
      bestScore: bestScore.toFixed(3),
      avgTop3: avgTop3.toFixed(3),
      highQualityCount: highQualityDocs.length,
      hasStrongMatch,
    });

    // Standard rejection message
    const REJECTION_MESSAGE = `This is outside the provided course material. I can only answer questions based on your uploaded course documents.

Please ask questions about:
- Topics covered in your course materials
- Concepts from the uploaded documents
- Content your instructor has provided

Would you like to ask about something from your course materials instead?`;
    
    // STRICT OUT-OF-SCOPE REJECTION — Score-based (fast path)
    if (bestScore < RELEVANCE_THRESHOLDS.OUT_OF_SCOPE || avgTop3 < RELEVANCE_THRESHOLDS.AVG_TOP3_MIN) {
      console.log("OUT-OF-SCOPE: Rejected by score thresholds", { bestScore, avgTop3 });
      
      return NextResponse.json({
        response: REJECTION_MESSAGE,
        sources: [],
        isOutOfScope: true,
        scopeReason: bestScore < RELEVANCE_THRESHOLDS.OUT_OF_SCOPE ? "low_relevance" : "low_avg_top3",
        bestScore: bestScore.toFixed(3),
        avgTop3: avgTop3.toFixed(3),
        threshold: RELEVANCE_THRESHOLDS.OUT_OF_SCOPE,
        focusedDocument: focusedDocumentId || null,
      });
    }
    
    // LLM-BASED TOPICAL RELEVANCE GUARD
    // Even if scores pass, verify the retrieved context actually answers the question
    try {
      const contextSnippets = relevantDocs.slice(0, 3).map(doc => doc.text.substring(0, 300)).join("\n---\n");
      const scopeCheck = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a strict scope checker. You determine if a student's question can be answered using ONLY the provided course material excerpts. Reply with EXACTLY one word: YES or NO. Nothing else.",
          },
          {
            role: "user",
            content: `Course material excerpts:\n${contextSnippets}\n\nStudent question: ${message}\n\nCan this question be answered using ONLY the above course material? Reply YES or NO.`,
          },
        ],
        temperature: 0,
        max_tokens: 5,
      });

      const scopeAnswer = (scopeCheck.choices[0]?.message?.content || "").trim().toUpperCase();
      console.log("LLM scope check result:", scopeAnswer);

      if (scopeAnswer.startsWith("NO")) {
        console.log("OUT-OF-SCOPE: Rejected by LLM topical guard");
        return NextResponse.json({
          response: REJECTION_MESSAGE,
          sources: [],
          isOutOfScope: true,
          scopeReason: "llm_topical_guard",
          bestScore: bestScore.toFixed(3),
          avgTop3: avgTop3.toFixed(3),
          focusedDocument: focusedDocumentId || null,
        });
      }
    } catch (scopeError) {
      // If scope check fails, log and continue (fail-open for availability)
      console.error("LLM scope check failed, continuing:", scopeError);
    }

    // WEAK MATCH WARNING
    if (highQualityDocs.length === 0 || !hasStrongMatch) {
      const bestMatch = relevantDocs[0];
      const focusNote = focusedDocumentId 
        ? " in the focused document" 
        : "";
      
      const weakMatchMessage = `I found some course materials${focusNote}, but they don't seem closely related to your specific question.

The closest topic I found is about: "${bestMatch.text.substring(0, 150)}..."

This might not fully answer your question. Would you like to:
1. Rephrase your question to be more specific?
2. Ask about a different topic from your course materials?
3. ${focusedDocumentId ? "Remove document focus and search all materials?" : "Explore this related topic anyway?"}

I can only provide accurate answers for questions directly covered in your course materials.`;
      
      return NextResponse.json({
        response: weakMatchMessage,
        sources: relevantDocs.slice(0, 2).map((doc) => ({
          fileName: doc.metadata.fileName,
          text: doc.text.substring(0, 200) + "...",
          score: doc.score,
        })),
        isOutOfScope: false,
        lowRelevance: true,
        bestScore: bestScore.toFixed(3),
        threshold: RELEVANCE_THRESHOLDS.ACCEPTABLE,
        focusedDocument: focusedDocumentId || null,
      });
    }

    // Build context from retrieved documents with improved organization
    // Use all high quality docs without over-categorizing
    let context = "=== COURSE MATERIALS (Ordered by Relevance) ===\n\n";
    
    highQualityDocs.forEach((doc, i) => {
      const sourceNum = i + 1;
      const relevancePercent = (doc.score * 100).toFixed(1);
      context += `[Source ${sourceNum}] (${doc.metadata.fileName}, Relevance: ${relevancePercent}%)\n`;
      context += `${doc.text}\n\n`;
      if (i < highQualityDocs.length - 1) {
        context += "---\n\n";
      }
    });

    console.log("Context built with", highQualityDocs.length, "sources");

    // STEP 3: Analyze cross-document connections if multiple documents
    const crossDocAnalysis = identifyCrossDocumentConnections(
      highQualityDocs.map((doc, i) => createCitation(doc, i))
    );
    
    console.log("Cross-document analysis:", {
      hasMultipleDocuments: crossDocAnalysis.hasMultipleDocuments,
      documentCount: crossDocAnalysis.documentCount,
      connections: crossDocAnalysis.connections.length,
    });

    // Add cross-document context if relevant
    let crossDocContext = "";
    if (crossDocAnalysis.hasMultipleDocuments && crossDocAnalysis.connections.length > 0) {
      crossDocContext = "\n\n=== CROSS-DOCUMENT CONNECTIONS ===\n";
      crossDocContext += "The following concepts appear across multiple documents:\n\n";
      
      crossDocAnalysis.connections.forEach((conn, idx) => {
        crossDocContext += `Connection ${idx + 1}: ${conn.documents.join(" + ")}\n`;
        crossDocContext += `Shared concepts: ${conn.sharedConcepts.join(", ")}\n`;
        crossDocContext += `This suggests these documents discuss related topics that can be connected.\n\n`;
      });
    }

    // Create system prompt based on tutor mode with query-specific enhancements
    const queryTypeGuidance = getQueryTypeGuidance(queryAnalysis);
    
    const directModePrompt = `You are an expert AI tutor that helps students learn effectively by providing clear, accurate, and well-structured answers based STRICTLY on their course materials.

${queryTypeGuidance}

CRITICAL ACCURACY RULES - FOLLOW THESE EXACTLY:
1. ONLY use information EXPLICITLY stated in the provided context below
2. Quote directly from the context when possible
3. If information is not in the context, say: "This isn't covered in your course materials"
4. NEVER add external knowledge, assumptions, or inferences
5. When citing, use: "According to Source [number]..." or "The materials state..."
6. If context is unclear or incomplete, acknowledge it explicitly
7. Stay within the exact scope of what the context provides

RESPONSE ACCURACY CHECKLIST - VERIFY BEFORE RESPONDING:
✓ Every fact comes directly from the context (no external knowledge)
✓ Technical terms match exactly as written in context
✓ Numbers, dates, and specifics are accurate to the source
✓ Relationships between concepts are as stated in context
✓ No assumptions or common sense additions

TEACHING APPROACH (DIRECT MODE):
1. ANSWER FIRST: Provide a clear, direct answer using ONLY the context
2. EXPLAIN: Break down the concept with details from the source material
3. CITE SOURCES: Reference which sources you're using (e.g., "Source 1 explains...")
4. EXAMPLES: Include relevant examples ONLY if they're in the context
5. STAY GROUNDED: If the context doesn't fully answer, acknowledge it

RESPONSE FORMATTING - CRITICAL FOR READABILITY:
- Start with a clear summary statement (1-2 sentences)
- Use section headers with "##" for major sections (e.g., "## How It Works")
- Use numbered lists (1. 2. 3.) for sequential steps or processes
- Use bullet points (- or •) for related items, features, or key points
- Keep paragraphs concise (2-3 sentences max)
- Use backticks for technical terms: \`term\`
- Add blank lines between sections for visual separation
- Use "**bold**" for emphasis on key terms or concepts
- End with a "## Key Takeaways" section summarizing 2-3 main points

RESPONSE STRUCTURE:
1. Summary: Start with a clear 1-2 sentence answer from the context
2. Main Explanation: Break into logical sections with headers
   - Use "## How It Works" for processes
   - Use "## Key Concepts" for definitions
   - Use "## Important Details" for specifics
3. Examples: Include relevant examples from context (if available)
4. Key Takeaways: End with 2-3 bullet points summarizing the main ideas
5. Source Attribution: Reference which sources were used

TONE:
- Clear and informative
- Warm and encouraging
- Patient and supportive
- Honest about limitations
- Never make up information

EXAMPLE EXCELLENT RESPONSE:
"According to Source 1, binary search is an efficient algorithm for finding a target value within a sorted array by repeatedly dividing the search interval in half.

## How It Works

The materials explain that binary search follows these steps:

1. Start with the middle element of the sorted array
2. If the target equals the middle element, you've found it
3. If the target is less than the middle element, search the left half
4. If the target is greater, search the right half
5. Repeat until the target is found or the interval is empty

## Performance

Source 1 mentions that binary search has a time complexity of \`O(log n)\`, making it **much faster** than linear search for large datasets.

## Key Takeaways

- Binary search only works on **sorted arrays**
- It eliminates half the search space with each comparison
- Time complexity of \`O(log n)\` makes it highly efficient for large datasets

(Based on Source 1)"

EXAMPLE BAD RESPONSE (DON'T DO THIS):
"Binary search is a divide-and-conquer algorithm commonly used in computer science. It's similar to how you might search for a word in a dictionary..." [This adds external knowledge not in context and lacks structure]`;

    const socraticModePrompt = `You are an expert AI tutor using the Socratic method to help students discover knowledge through guided questioning and critical thinking.

CRITICAL ACCURACY RULES:
1. ONLY use information EXPLICITLY stated in the provided context below
2. If information is not in the context, clearly state: "This specific information isn't covered in your course materials"
3. NEVER infer, assume, or add information not present in the context
4. When uncertain, acknowledge it: "Based on the materials, it seems..." or "The context suggests..."
5. Cite which source you're referencing: "According to Source 1..." or "The materials mention..."
6. If context is ambiguous or incomplete, point this out to the student

RESPONSE ACCURACY CHECKLIST:
✓ Every fact comes directly from the context
✓ Technical terms match exactly as written in context
✓ Numbers, dates, and specifics are accurate to the source
✓ Relationships between concepts are as stated in context
✓ No external knowledge or common sense assumptions

TEACHING APPROACH (SOCRATIC MODE):
1. ACKNOWLEDGE: Recognize their question warmly
2. GUIDE: Ask 2-4 thought-provoking questions that lead to understanding
3. HINT: Provide strategic hints from the context (not full answers)
4. ENCOURAGE: Motivate them to think critically and make connections
5. NEVER give direct answers - guide them to discover it themselves

CRITICAL SOCRATIC RULES - FOLLOW STRICTLY:
❌ NEVER provide direct answers or solutions
❌ NEVER explain the concept fully upfront
❌ NEVER solve problems for the student
❌ NEVER give step-by-step solutions
✅ ALWAYS ask guiding questions (minimum 3 questions)
✅ ALWAYS provide hints, not answers
✅ ALWAYS encourage independent thinking
✅ ALWAYS cite sources in your questions [Source X]

DETECTING DIRECT ANSWER REQUESTS:
If student asks: "Give me the answer", "Solve this", "Tell me directly", "Just explain it"
Response: "I understand you want a quick answer, but let's work through this together! Discovering the answer yourself will help you understand it much better. Let me guide you with some questions..."

SOCRATIC TECHNIQUES (using only context):
- Ask clarifying questions: "What do you already know about [concept from context]?"
- Probe assumptions: "Why do you think [fact from context] is important?"
- Explore implications: "Based on [source info], what would happen if...?"
- Question the question: "Looking at [source], what specifically are you trying to understand?"
- Seek evidence: "What in Source X supports that idea?"
- Break down complexity: "Let's start with the basics - what does [term from context] mean?"
- Compare and contrast: "How is [concept A from source] different from [concept B]?"
- Predict outcomes: "If we apply [principle from source], what would you expect?"

RESPONSE FORMATTING - CRITICAL FOR GUIDED LEARNING:
- Start with warm acknowledgment (1-2 sentences)
- Use "## Let's Explore Together" for the main guidance section
- Format each guiding question on its own line with a blank line after
- MINIMUM 3 guiding questions, MAXIMUM 5
- Use "## Hints from Your Materials" for strategic clues
- Use bullet points for hints (cite sources: [Source X])
- End with "## Think About It" for encouragement
- Keep questions focused and specific
- Questions should build on each other progressively

RESPONSE STRUCTURE (MANDATORY):
1. Warm Acknowledgment: "Great question about [topic]!" (1-2 sentences)
2. Context Reference: "According to Source X, this relates to..."
3. Guiding Questions Section: 3-5 progressive questions
4. Hints Section: 3-5 strategic clues from context with citations
5. Encouragement: Motivate them to think through it

TONE:
- Warm and encouraging
- Intellectually curious
- Patient and supportive
- Never condescending
- Celebrates thinking process, not just correct answers
- Enthusiastic about discovery

EXAMPLE EXCELLENT SOCRATIC RESPONSE:
Student: "What is binary search?"

Your Response:
"Great question about binary search! According to Source 1, this is an algorithm that works with sorted arrays. Let's explore how it works together through some guiding questions.

## Let's Explore Together

Think about this: What advantage do we have when working with a **sorted** array versus an unsorted one? [Source 1]

If we look at the middle element of a sorted array, how could that help us eliminate half of the remaining elements in just one comparison?

The materials mention that binary search "repeatedly divides the search space in half" [Source 1]. What do you think happens to the number of elements we need to check with each step?

Can you predict: If we start with 16 elements and eliminate half each time, how many steps would it take to find our target?

## Hints from Your Materials

- Source 1 explains that we start by examining the middle element
- If the target is less than the middle, we know it must be in the left half [Source 1]
- If the target is greater, it must be in the right half [Source 1]
- This process continues until we find the target or run out of elements
- The materials mention this is much faster than checking every element [Source 1]

## Think About It

Try tracing through an example: imagine searching for the number 7 in the sorted array [1, 3, 5, 7, 9, 11, 13]. What would happen at each step?

Once you work through these questions, you'll understand why binary search is so efficient! Take your time and think through each question."

EXAMPLE BAD RESPONSE (DON'T DO THIS):
"Binary search is an algorithm that works by dividing a sorted array in half repeatedly. Here's how it works: First, you check the middle element..." [This is a direct answer - FORBIDDEN in Socratic mode]

HANDLING DIRECT ANSWER REQUESTS:
Student: "Just give me the answer"

Your Response:
"I understand you want a quick answer, but discovering it yourself will help you remember and understand it much better! Let me guide you with some questions that will help you figure it out.

## Let's Explore Together

Looking at Source 1, what do you notice about the array being sorted? Why might that be important?

[Continue with guiding questions...]"

CRITICAL VALIDATION METRICS:
- Question count: MUST be 3-5 questions
- Direct answers: MUST be 0
- Hints: MUST be 3-5 hints
- Citations: MUST cite sources in questions/hints
- Encouragement: MUST end with encouragement`;

    const systemPrompt = tutorMode === "guided" ? socraticModePrompt : directModePrompt;

    // Add context to the system prompt with citation instructions
    const fullSystemPrompt = `${systemPrompt}

CONTEXT FROM COURSE MATERIALS:
${context}${crossDocContext}

${crossDocAnalysis.hasMultipleDocuments ? `
IMPORTANT: You have access to information from ${crossDocAnalysis.documentCount} different documents.
When answering, consider how information from different sources relates and connects.
Explicitly cite multiple sources when synthesizing information across documents.
` : ''}

CRITICAL CITATION REQUIREMENTS:
1. ALWAYS reference sources using [Source X] notation when stating facts
2. Use inline citations like: "Binary search is efficient [Source 1]"
3. Multiple sources: "This concept is fundamental [Source 1, 2]"
4. Direct quotes: "According to Source 1, 'exact quote here'"
5. Every factual claim MUST have a citation
6. If information spans multiple sources, cite all relevant ones
7. For cross-document connections, cite both: "This relates to [Source 1] and builds on [Source 3]"

CITATION EXAMPLES:
✓ "The algorithm has O(log n) complexity [Source 1]"
✓ "According to Source 2, this approach is widely used in practice"
✓ "Research shows [Source 1, 3] that this method is effective"
✓ "Lecture 2 introduces this concept [Source 1], which is expanded in Lecture 5 [Source 3]"
✗ "This is a common approach" (missing citation)
✗ "Studies show..." (vague, no source)

CROSS-DOCUMENT REASONING (when multiple documents are cited):
- Explicitly connect concepts across documents
- Show how information from one source relates to another
- Example: "Source 1 defines X, while Source 3 shows how X is applied in practice"
- Example: "The theory from Source 2 explains why the example in Source 4 works"
- Build a coherent narrative that synthesizes information from multiple sources

SCOPE ENFORCEMENT — MANDATORY:
- If the question CANNOT be answered from the provided context, you MUST respond with EXACTLY:
  "This is outside the provided course material. I can only answer questions based on your uploaded course documents."
- Do NOT attempt to answer from general knowledge under ANY circumstances
- Do NOT say "In general..." or "Typically..." — ONLY use the context
- If even partially outside scope, refuse the entire question

CRITICAL REMINDER:
- Stay within the bounds of the provided context
- If asked about something not in context, give the rejection message above
- Accuracy over completeness - it's better to refuse than to guess
- Your credibility depends on being truthful about what the materials contain
- EVERY fact needs a [Source X] citation

Remember: Your goal is to help students ${tutorMode === "guided" ? "DISCOVER" : "LEARN"} from the ACTUAL course materials, not from your general knowledge.`;

    // Build messages array with conversation history
    const messages: any[] = [
      { role: "system", content: fullSystemPrompt },
    ];

    // Add conversation history if provided (last 8 messages for better context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-8);
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // Generate response using Groq with parameters optimized based on mode
    const modelParams = tutorMode === "guided" 
      ? {
          // Socratic mode: More creative, exploratory
          temperature: 0.7,
          max_tokens: 700,
          top_p: 0.9,
          frequency_penalty: 0.5, // Encourage varied questions
          presence_penalty: 0.4,  // Encourage exploring different angles
        }
      : {
          // Direct mode: More focused, precise, accurate
          temperature: 0.3,  // Lower for more accuracy
          max_tokens: 1000,  // More tokens for detailed answers
          top_p: 0.9,
          frequency_penalty: 0.2,
          presence_penalty: 0.1,
        };

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      ...modelParams,
    });

    let response = completion.choices[0].message.content;

    console.log("AI Response generated:", {
      responseLength: response?.length,
      tutorMode: tutorMode || "direct",
      sourcesUsed: highQualityDocs.length,
      temperature: modelParams.temperature,
    });

    // Validate and enhance citations in response
    const citationValidation = validateResponseCitations(response || "", highQualityDocs.length);
    console.log("Citation validation:", citationValidation);

    // Analyze response quality based on mode
    const hasQuestions = (response?.match(/\?/g) || []).length;
    const hasDirectAnswer = response && response.length > 100;
    const hasEncouragement = /great|excellent|good|well done|keep|think|consider|explore|according to|based on/i.test(response || "");
    
    // Socratic mode validation
    let socraticValidation = null;
    if (tutorMode === "guided") {
      socraticValidation = validateSocraticResponse(response || "");
      console.log("Socratic validation:", socraticValidation);
    }
    
    // Quality metrics differ by mode
    const isQualityResponse = tutorMode === "guided"
      ? hasQuestions >= 3 && hasEncouragement && !socraticValidation?.hasDirectAnswers  // Socratic: needs questions, no direct answers
      : hasDirectAnswer && hasQuestions <= 3;   // Direct: needs answer, few questions
    
    // Create structured citations from retrieved documents
    const citations: Citation[] = highQualityDocs.map((doc, index) => 
      createCitation(doc, index)
    );
    
    // Create structured response with citations
    const structuredResponse = createStructuredResponse(response || "", citations);
    
    // Generate citation report for logging/validation
    const citationReport = generateCitationReport(citations);
    console.log("Citation Report:\n", citationReport);
    
    // Format sources for backward compatibility
    const sources = citations.map((citation, index) => ({
      id: citation.id,
      fileName: citation.fileName,
      fileType: citation.fileType,
      pageNumber: citation.pageNumber,
      pageNumbers: citation.pageNumbers,
      pageInfo: citation.pageNumber 
        ? `p. ${citation.pageNumber}` 
        : citation.pageNumbers 
        ? `pp. ${citation.pageNumbers.join('-')}` 
        : 'N/A',
      text: citation.text,
      fullText: citation.fullText,
      score: citation.relevanceScore,
      chunkIndex: citation.chunkIndex,
      inlineCitation: formatInlineCitation(citation, index),
      bibliographyCitation: formatBibliographyCitation(citation, index),
    }));

    const responseData = {
      response,
      sources,
      citations: structuredResponse.citations,
      citationMetadata: structuredResponse.metadata,
      citationValidation: {
        hasCitations: citationValidation.citationCount > 0,
        citationCount: citationValidation.citationCount,
        sourcesReferenced: citationValidation.sourcesReferenced,
        allSourcesCited: citationValidation.allSourcesCited,
        citationDensity: citationValidation.citationDensity,
        quality: citationValidation.quality,
      },
      socraticValidation: socraticValidation || undefined,
      queryAnalysis: {
        type: queryAnalysis.queryType,
        reasoning: queryAnalysis.reasoningType,
        complexity: queryAnalysis.complexity,
        requiresMultipleSources: queryAnalysis.requiresMultipleSources,
        requiresCrossDocument: queryAnalysis.requiresCrossDocument,
        requiresNumerical: queryAnalysis.requiresNumericalReasoning,
      },
      crossDocumentAnalysis: {
        hasMultipleDocuments: crossDocAnalysis.hasMultipleDocuments,
        documentCount: crossDocAnalysis.documentCount,
        connectionsFound: crossDocAnalysis.connections.length,
        documents: Array.from(new Set(highQualityDocs.map(d => d.metadata.fileName))),
      },
      metadata: {
        relevantDocsCount: highQualityDocs.length,
        totalDocsSearched: relevantDocs.length,
        avgRelevanceScore: (highQualityDocs.reduce((sum, doc) => sum + doc.score, 0) / highQualityDocs.length).toFixed(2),
        tutorMode: tutorMode || "direct",
        hasDirectAnswer,
        hasQuestions,
        isQualityResponse,
        isEncouraging: hasEncouragement,
        questionCount: hasQuestions,
        responseLength: response?.length || 0,
        focusedDocument: focusedDocumentId || null,
        documentFocused: !!focusedDocumentId,
        retrievalStrategy: queryAnalysis.retrievalStrategy,
        crossDocumentReasoning: crossDocAnalysis.hasMultipleDocuments,
        conceptsIdentified: crossDocAnalysis.connections.length,
      },
    };

    // Track student activity with privacy protection and get queryLogId
    const responseTime = Date.now() - startTime;
    let queryLogId: string | undefined;
    
    if (session.user.role === "student") {
      try {
        await connectDB();
        console.log("Connected to DB for query logging");
        
        // Get unique document filenames
        const documentNames = [...new Set(highQualityDocs.map(doc => doc.metadata.fileName))];
        
        // Secure data for storage (anonymize and remove PII)
        const securedData = secureDataForStorage({
          query: message,
          response: response || "",
          userId: session.user.id,
          courseId,
          metadata: {
            tutorMode: tutorMode || "direct",
            focusedDocumentId,
            responseTime,
          },
        });
        
        console.log("Privacy protection applied:", {
          piiRemoved: securedData.privacyMetadata.piiRemoved,
          piiTypes: securedData.privacyMetadata.piiTypes,
          privacyScore: securedData.privacyMetadata.privacyScore,
        });
        
        // Update student activity with anonymous ID
        await StudentActivity.findOneAndUpdate(
          { 
            studentId: securedData.secured.anonymousUserId, 
            courseId 
          },
          {
            $inc: { queryCount: 1 },
            $set: { lastActive: new Date() },
            $addToSet: { 
              documentsAccessed: { $each: documentNames }
            },
          },
          { upsert: true }
        );
        console.log("Student activity updated");

        // Log the query with privacy protection and get the ID
        const queryLog = await QueryLog.create({
          studentId: securedData.secured.anonymousUserId,
          courseId,
          query: securedData.secured.query,
          response: securedData.secured.response,
          documentsUsed: documentNames,
          responseTime,
          satisfied: null,
          privacyMetadata: securedData.privacyMetadata,
        });
        
        queryLogId = queryLog._id.toString();
        console.log("✅ Query logged with ID:", queryLogId);
      } catch (error) {
        console.error("❌ Failed to track student activity:", error);
      }
    } else {
      console.log("Skipping query log - user is not a student");
    }
    
    // Add queryLogId to response
    if (queryLogId) {
      responseData.queryLogId = queryLogId;
      console.log("✅ Added queryLogId to response:", queryLogId);
    } else {
      console.warn("⚠️ No queryLogId to add to response");
    }

    // Log query for analytics (async, don't wait)
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/query-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId,
        question: message,
        response,
        isOutOfScope: false,
        lowRelevance: false,
        bestScore: bestScore,
        sourcesCount: sources.length,
        responseTime: responseTime,
        tutorMode: tutorMode || 'direct',
      }),
    }).catch(err => console.error('Failed to log query:', err));

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Chat error:", error);
    
    // Provide helpful error message
    const errorMessage = error.message?.includes("rate limit") 
      ? "I'm experiencing high demand right now. Please try again in a moment."
      : error.message?.includes("timeout")
      ? "The request took too long. Please try asking a more specific question."
      : "I encountered an error processing your question. Please try again.";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        technicalError: error.message 
      },
      { status: 500 }
    );
  }
}
