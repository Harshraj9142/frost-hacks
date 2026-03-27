import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { queryVectors } from "@/lib/vector-store";
import Groq from "groq-sdk";
import {
  createCitation,
  createStructuredResponse,
  formatInlineCitation,
  formatBibliographyCitation,
  generateCitationReport,
  validateResponseCitations,
  validateSocraticResponse,
  type Citation,
} from "@/lib/citations";
import connectDB from "@/lib/mongodb";
import StudentActivity from "@/models/StudentActivity";
import QueryLog from "@/models/QueryLog";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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

    // Query relevant documents from Pinecone using semantic search
    // Retrieve more chunks for better context coverage
    let relevantDocs;
    
    if (focusedDocumentId) {
      console.log("Querying with document focus:", focusedDocumentId);
      // If focused on a specific document, retrieve more chunks for better coverage
      relevantDocs = await queryVectors(message, courseId, 8, focusedDocumentId);
      console.log("Focused query returned:", relevantDocs.length, "results");
    } else {
      console.log("Querying all documents in course");
      // Query all documents in the course with more results
      relevantDocs = await queryVectors(message, courseId, 10);
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

    // Enhanced out-of-scope detection with adjusted thresholds
    const RELEVANCE_THRESHOLDS = {
      HIGH_QUALITY: 0.65,      // Strong match - definitely in scope
      ACCEPTABLE: 0.50,        // Acceptable match - likely in scope
      OUT_OF_SCOPE: 0.40,      // Below this - definitely out of scope
    };

    const bestScore = relevantDocs[0]?.score || 0;
    const highQualityDocs = relevantDocs.filter(doc => doc.score >= RELEVANCE_THRESHOLDS.ACCEPTABLE);
    const hasStrongMatch = relevantDocs.some(doc => doc.score >= RELEVANCE_THRESHOLDS.HIGH_QUALITY);
    
    console.log("Relevance scores:", {
      bestScore: bestScore.toFixed(3),
      highQualityCount: highQualityDocs.length,
      hasStrongMatch,
    });
    
    // STRICT OUT-OF-SCOPE REJECTION
    if (bestScore < RELEVANCE_THRESHOLDS.OUT_OF_SCOPE) {
      const outOfScopeMessage = `I cannot answer this question as it appears to be outside the scope of your course materials.

Your question seems to be about topics not covered in the uploaded documents. I can only help with questions directly related to your course content.

${focusedDocumentId ? "You're currently focused on a specific document. " : ""}Please ask questions about:
- Topics covered in your course materials
- Concepts from the uploaded documents
- Content your instructor has provided

Would you like to ask about something from your course materials instead?`;
      
      return NextResponse.json({
        response: outOfScopeMessage,
        sources: [],
        isOutOfScope: true,
        scopeReason: "low_relevance",
        bestScore: bestScore.toFixed(3),
        threshold: RELEVANCE_THRESHOLDS.OUT_OF_SCOPE,
        focusedDocument: focusedDocumentId || null,
      });
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

    // Create system prompt based on tutor mode
    const directModePrompt = `You are an expert AI tutor that helps students learn effectively by providing clear, accurate, and well-structured answers based STRICTLY on their course materials.

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
${context}

CRITICAL CITATION REQUIREMENTS:
1. ALWAYS reference sources using [Source X] notation when stating facts
2. Use inline citations like: "Binary search is efficient [Source 1]"
3. Multiple sources: "This concept is fundamental [Source 1, 2]"
4. Direct quotes: "According to Source 1, 'exact quote here'"
5. Every factual claim MUST have a citation
6. If information spans multiple sources, cite all relevant ones

CITATION EXAMPLES:
✓ "The algorithm has O(log n) complexity [Source 1]"
✓ "According to Source 2, this approach is widely used in practice"
✓ "Research shows [Source 1, 3] that this method is effective"
✗ "This is a common approach" (missing citation)
✗ "Studies show..." (vague, no source)

CRITICAL REMINDER:
- Stay within the bounds of the provided context
- If asked about something not in context, redirect to what IS available
- Accuracy over completeness - it's better to say "I don't know" than to guess
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
      },
    };

    // Track student activity (async, don't block response)
    const responseTime = Date.now() - startTime;
    
    if (session.user.role === "student") {
      connectDB().then(async () => {
        try {
          // Get unique document filenames
          const documentNames = [...new Set(highQualityDocs.map(doc => doc.metadata.fileName))];
          
          // Update student activity
          await StudentActivity.findOneAndUpdate(
            { studentId: session.user.id, courseId },
            {
              $inc: { queryCount: 1 },
              $set: { lastActive: new Date() },
              $addToSet: { 
                documentsAccessed: { $each: documentNames }
              },
            },
            { upsert: true }
          );

          // Log the query
          await QueryLog.create({
            studentId: session.user.id,
            courseId,
            query: message,
            response: response || "",
            documentsUsed: documentNames,
            responseTime,
            satisfied: null, // Can be updated later via feedback
          });
        } catch (error) {
          console.error("Failed to track student activity:", error);
        }
      }).catch(err => console.error("DB connection error:", err));
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
