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
    const directModePrompt = `You are an expert AI tutor that helps students learn effectively by providing clear, accurate answers based STRICTLY on their course materials.

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
5. STAY GROUNDED: If the context doesn't fully answer the question, say so

RESPONSE FORMATTING:
- Use clear paragraphs separated by double newlines
- Use numbered lists (1. 2. 3.) for sequential steps
- Use bullet points (- or •) for related items
- Keep paragraphs concise (2-3 sentences max)
- Use backticks for technical terms: \`term\`

RESPONSE STRUCTURE:
1. Direct Answer: Start with a clear answer from the context (1-2 sentences)
2. Explanation: Provide detailed explanation using ONLY context (2-3 paragraphs)
3. Source Citation: Explicitly reference which sources you used
4. Limitations: If context doesn't fully answer, acknowledge it

TONE:
- Clear and informative
- Warm and encouraging
- Patient and supportive
- Honest about limitations
- Never make up information

EXAMPLE GOOD RESPONSE:
"According to Source 1, binary search is an efficient algorithm for finding a target value within a sorted array. The materials explain that it works by repeatedly dividing the search interval in half.

Here's how it works based on the course materials:
1. Start with the middle element of the sorted array
2. If the target equals the middle element, you've found it
3. If the target is less than the middle element, search the left half
4. If the target is greater, search the right half
5. Repeat until the target is found or the interval is empty

Source 1 mentions that binary search has a time complexity of O(log n), making it much faster than linear search for large datasets."

EXAMPLE BAD RESPONSE (DON'T DO THIS):
"Binary search is a divide-and-conquer algorithm commonly used in computer science. It's similar to how you might search for a word in a dictionary..." [This adds external knowledge not in context]`;

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

SOCRATIC TECHNIQUES (using only context):
- Ask clarifying questions: "What do you already know about [concept from context]?"
- Probe assumptions: "Why do you think [fact from context] is important?"
- Explore implications: "Based on [source info], what would happen if...?"
- Question the question: "Looking at [source], what specifically are you trying to understand?"
- Seek evidence: "What in Source X supports that idea?"
- Break down complexity: "Let's start with the basics - what does [term from context] mean?"

RESPONSE FORMATTING:
- Use clear paragraphs separated by double newlines
- Format questions on separate lines for emphasis
- Use numbered lists for sequential thinking steps
- Use bullet points for hints or related concepts
- Keep questions focused and specific
- End with encouragement

RESPONSE STRUCTURE:
1. Warm Acknowledgment: "Great question about [topic]!" (1 sentence)
2. Context Reference: "Let's explore this using your course materials." (1 sentence)
3. Guiding Questions: 2-4 questions that lead to discovery
4. Strategic Hints: Provide clues from the context (not answers)
5. Encouragement: "Think about these connections and see what you discover!"

TONE:
- Warm and encouraging
- Intellectually curious
- Patient and supportive
- Never condescending
- Celebrates thinking process, not just correct answers

EXAMPLE SOCRATIC RESPONSE:
Student: "What is binary search?"

Your Response:
"Great question about binary search! Let's explore this concept together using your course materials.

According to Source 1, binary search works with sorted arrays. Let me guide you to understand how:

What do you think happens when we look at the middle element of a sorted array?

If we're searching for a value and it's not the middle element, how could we use the fact that the array is sorted to eliminate half the possibilities?

Here's a hint from your materials: The algorithm repeatedly divides the search space in half. Why would this be faster than checking every element?

Think about these questions step by step. What pattern do you notice about how the search space changes with each step?"

CRITICAL RULES FOR SOCRATIC MODE:
- NEVER give the direct answer
- ALWAYS ask guiding questions
- Provide hints, not solutions
- Reference the context in your questions
- Guide them to discover the answer themselves
- Celebrate their thinking process
- If they're stuck, ask simpler questions to build up understanding`;

    const systemPrompt = tutorMode === "guided" ? socraticModePrompt : directModePrompt;

    // Add context to the system prompt
    const fullSystemPrompt = `${systemPrompt}

CONTEXT FROM COURSE MATERIALS:
${context}

CRITICAL REMINDER:
- Stay within the bounds of the provided context
- If asked about something not in context, redirect to what IS available
- Accuracy over completeness - it's better to say "I don't know" than to guess
- Your credibility depends on being truthful about what the materials contain

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

    const response = completion.choices[0].message.content;

    console.log("AI Response generated:", {
      responseLength: response?.length,
      tutorMode: tutorMode || "direct",
      sourcesUsed: highQualityDocs.length,
      temperature: modelParams.temperature,
    });

    // Analyze response quality based on mode
    const hasQuestions = (response?.match(/\?/g) || []).length;
    const hasDirectAnswer = response && response.length > 100;
    const hasEncouragement = /great|excellent|good|well done|keep|think|consider|explore|according to|based on/i.test(response || "");
    
    // Quality metrics differ by mode
    const isQualityResponse = tutorMode === "guided"
      ? hasQuestions >= 2 && hasEncouragement  // Socratic: needs questions
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
