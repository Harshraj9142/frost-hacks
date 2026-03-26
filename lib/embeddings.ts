import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "models/gemini-embedding-001"
    });
    
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768
    });
    
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "models/gemini-embedding-001"
    });
    
    // Generate embeddings one by one (Gemini doesn't support batch for embeddings)
    const embeddings = await Promise.all(
      texts.map(async (text) => {
        const result = await model.embedContent({
          content: { parts: [{ text }] },
          taskType: "RETRIEVAL_DOCUMENT",
          outputDimensionality: 768
        });
        return result.embedding.values;
      })
    );

    return embeddings;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error("Failed to generate embeddings");
  }
}
