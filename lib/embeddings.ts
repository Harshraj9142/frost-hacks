import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const TARGET_DIMENSION = 768; // Pinecone index dimension

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "models/embedding-001"
    });
    
    const result = await model.embedContent(text);
    let embedding = result.embedding.values;
    
    // Ensure embedding matches target dimension
    if (embedding.length > TARGET_DIMENSION) {
      console.warn(`Truncating embedding from ${embedding.length} to ${TARGET_DIMENSION} dimensions`);
      embedding = embedding.slice(0, TARGET_DIMENSION);
    } else if (embedding.length < TARGET_DIMENSION) {
      console.warn(`Padding embedding from ${embedding.length} to ${TARGET_DIMENSION} dimensions`);
      embedding = [...embedding, ...new Array(TARGET_DIMENSION - embedding.length).fill(0)];
    }
    
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "models/embedding-001"
    });
    
    // Generate embeddings one by one (Gemini doesn't support batch for embeddings)
    const embeddings = await Promise.all(
      texts.map(async (text) => {
        const result = await model.embedContent(text);
        let embedding = result.embedding.values;
        
        // Ensure embedding matches target dimension
        if (embedding.length > TARGET_DIMENSION) {
          embedding = embedding.slice(0, TARGET_DIMENSION);
        } else if (embedding.length < TARGET_DIMENSION) {
          embedding = [...embedding, ...new Array(TARGET_DIMENSION - embedding.length).fill(0)];
        }
        
        return embedding;
      })
    );

    return embeddings;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error("Failed to generate embeddings");
  }
}
