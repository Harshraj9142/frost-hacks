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

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { message, courseId, conversationHistory, focusedDocumentId } = await req.json();

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
        focusedDocument: focusedDocumentId || null,
      });
    }

    // Use a more lenient threshold for better coverage (0.60 instead of 0.65)
    const highQualityDocs = relevantDocs.filter(doc => doc.score >= 0.60);
    
    if (highQualityDocs.length === 0) {
      // Provide helpful response even with low-quality matches
      const bestMatch = relevantDocs[0];
      const focusNote = focusedDocumentId 
        ? " in the focused document" 
        : "";
      
      return NextResponse.json({
        response: `I found some course materials${focusNote}, but they don't seem closely related to your specific question. The closest topic I found is about "${bestMatch.text.substring(0, 100)}..."\n\nWould you like to:\n1. Explore this related topic?\n2. Rephrase your question?\n3. ${focusedDocumentId ? "Remove document focus and search all materials?" : "Ask about something else from the course materials?"}`,
        sources: relevantDocs.slice(0, 2).map((doc) => ({
          fileName: doc.metadata.fileName,
          text: doc.text.substring(0, 200) + "...",
          score: doc.score,
        })),
        lowRelevance: true,
        focusedDocument: focusedDocumentId || null,
      });
    }

    // Build context from retrieved documents with better organization
    // Group by relevance tiers for better context understanding
    const veryHighRelevance = highQualityDocs.filter(doc => doc.score >= 0.80);
    const highRelevance = highQualityDocs.filter(doc => doc.score >= 0.70 && doc.score < 0.80);
    const mediumRelevance = highQualityDocs.filter(doc => doc.score >= 0.60 && doc.score < 0.70);

    let context = "";
    
    if (veryHighRelevance.length > 0) {
      context += "=== HIGHLY RELEVANT INFORMATION ===\n\n";
      context += veryHighRelevance
        .map((doc, i) => `[Source ${i + 1}] (${doc.metadata.fileName}, Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.text}`)
        .join("\n\n---\n\n");
    }
    
    if (highRelevance.length > 0) {
      if (context) context += "\n\n";
      context += "=== RELEVANT SUPPORTING INFORMATION ===\n\n";
      context += highRelevance
        .map((doc, i) => `[Source ${veryHighRelevance.length + i + 1}] (${doc.metadata.fileName}, Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.text}`)
        .join("\n\n---\n\n");
    }
    
    if (mediumRelevance.length > 0) {
      if (context) context += "\n\n";
      context += "=== ADDITIONAL CONTEXT ===\n\n";
      context += mediumRelevance
        .map((doc, i) => `[Source ${veryHighRelevance.length + highRelevance.length + i + 1}] (${doc.metadata.fileName}, Relevance: ${(doc.score * 100).toFixed(1)}%)\n${doc.text}`)
        .join("\n\n---\n\n");
    }

    // Create system prompt for RAG with strict context-only enforcement and accuracy focus
    const systemPrompt = `You are an expert AI tutor that helps students learn effectively by providing clear, accurate answers based on their course materials.

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

TEACHING APPROACH:
1. ANSWER FIRST: Provide a clear, direct answer to the student's question using the context
2. EXPLAIN: Break down the concept with details from the source material
3. EXAMPLES: Include relevant examples from the context if available
4. EXTEND (optional): Add 1-2 follow-up questions to deepen understanding
5. Maintain strict fidelity to source material

RESPONSE FORMATTING:
- Use clear paragraphs separated by double newlines
- Use numbered lists (1. 2. 3.) for sequential steps or multiple points
- Use bullet points (- or •) for related items or examples
- Keep paragraphs concise (2-3 sentences max)
- Use backticks for technical terms or code: \`term\`
- Bold key concepts for emphasis

RESPONSE STRUCTURE:
1. Direct Answer: Start with a clear answer to their question (1-2 sentences)
2. Explanation: Provide detailed explanation from the context (2-3 paragraphs)
3. Source Citation: Reference which sources you're using
4. Optional Follow-up: Add 1-2 questions to encourage deeper thinking (optional)

WHEN TO USE QUESTIONS:
- Use questions SPARINGLY and ONLY at the end
- Questions should help students apply or extend what they just learned
- NEVER answer a question with only questions - always provide the answer first
- Questions are for deepening understanding, not replacing answers

TONE:
- Clear and informative
- Warm and encouraging
- Patient and supportive
- Never condescending
- Honest about limitations of available materials

EXAMPLE GOOD RESPONSE:
Student: "What is binary search?"

Your Response:
"Binary search is an efficient algorithm for finding a target value within a sorted array. According to Source 1, it works by repeatedly dividing the search interval in half.

Here's how it works:

1. Start with the middle element of the sorted array
2. If the target equals the middle element, you've found it
3. If the target is less than the middle element, search the left half
4. If the target is greater, search the right half
5. Repeat until the target is found or the interval is empty

The materials mention that binary search has a time complexity of O(log n), making it much faster than linear search for large datasets. For example, in an array of 1000 elements, binary search needs at most 10 comparisons, while linear search might need up to 1000.

To deepen your understanding: Can you think of a real-world scenario where binary search would be particularly useful?"

EXAMPLE BAD RESPONSE (Don't do this):
"Great question about binary search! Let me guide you to discover the answer.

What do you already know about searching algorithms?

How do you think dividing a problem in half might help?

What would happen if the array wasn't sorted?

Think about these questions and see if you can figure out how binary search works!"

REMEMBER: Always provide the answer first, then optionally add questions at the end.
- Celebrate thinking, not just correct answers

EXAMPLE FORMAT:
Great question about [topic]! Let me help you explore this based on your course materials.

According to Source 1, [key fact from context]. 

What do you think this means in the context of [related concept from materials]?

Here are some hints from your course materials:
- [Direct reference to Source X]
- [Direct reference to Source Y]
- [Direct reference to Source Z]

Think about how these concepts connect. What patterns do you notice in the materials?

CONTEXT FROM COURSE MATERIALS:
${context}

CRITICAL REMINDER:
- Stay within the bounds of the provided context
- If asked about something not in context, redirect to what IS available
- Accuracy over completeness - it's better to say "I don't know" than to guess
- Your credibility depends on being truthful about what the materials contain

Remember: Your goal is to help students THINK about the ACTUAL course materials, not to teach them from your general knowledge.`;

    // Build messages array with conversation history
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided (last 8 messages for better context)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-8);
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // Generate response using Groq with parameters optimized for clear, direct answers
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.5, // Lower for more focused, direct responses
      max_tokens: 800, // More space for detailed explanations
      top_p: 0.85, // More focused on likely tokens
      frequency_penalty: 0.3, // Reduce repetition
      presence_penalty: 0.2, // Encourage covering all aspects
    });

    const response = completion.choices[0].message.content;

    // Analyze response quality
    const hasDirectAnswer = response && response.length > 100; // Should have substantial content
    const hasQuestions = (response?.match(/\?/g) || []).length;
    const isBalanced = hasQuestions <= 3; // Should have few questions, not many
    const hasEncouragement = /great|excellent|good|well done|keep|think|consider|explore|according to|based on/i.test(response || "");
    
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

    return NextResponse.json({
      response,
      sources,
      citations: structuredResponse.citations,
      citationMetadata: structuredResponse.metadata,
      metadata: {
        relevantDocsCount: highQualityDocs.length,
        totalDocsSearched: relevantDocs.length,
        avgRelevanceScore: (highQualityDocs.reduce((sum, doc) => sum + doc.score, 0) / highQualityDocs.length).toFixed(2),
        hasDirectAnswer,
        isBalanced,
        isEncouraging: hasEncouragement,
        questionCount: hasQuestions,
        responseLength: response?.length || 0,
        focusedDocument: focusedDocumentId || null,
        documentFocused: !!focusedDocumentId,
      },
    });
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
