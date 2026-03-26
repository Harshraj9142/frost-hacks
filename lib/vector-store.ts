import { getPineconeIndex } from "./pinecone";
import { generateEmbeddings } from "./embeddings";
import { v4 as uuidv4 } from "uuid";

export interface VectorMetadata {
  text: string;
  fileName: string;
  fileType: string;
  courseId: string;
  facultyId: string;
  chunkIndex: number;
  uploadedAt: string;
}

export async function indexDocument(
  chunks: string[],
  metadata: {
    fileName: string;
    fileType: string;
    courseId: string;
    facultyId: string;
  }
): Promise<{ success: boolean; vectorIds: string[] }> {
  try {
    const index = await getPineconeIndex();
    
    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);
    
    // Prepare vectors for upsert
    const vectors = chunks.map((chunk, i) => ({
      id: uuidv4(),
      values: embeddings[i],
      metadata: {
        text: chunk,
        fileName: metadata.fileName,
        fileType: metadata.fileType,
        courseId: metadata.courseId,
        facultyId: metadata.facultyId,
        chunkIndex: i,
        uploadedAt: new Date().toISOString(),
      } as VectorMetadata,
    }));

    // Upsert vectors in batches of 100
    const batchSize = 100;
    const vectorIds: string[] = [];

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert({ records: batch });
      vectorIds.push(...batch.map((v) => v.id));
    }

    return { success: true, vectorIds };
  } catch (error) {
    console.error("Error indexing document:", error);
    throw new Error("Failed to index document");
  }
}

export async function queryVectors(
  query: string,
  courseId: string,
  topK: number = 5
): Promise<Array<{ text: string; score: number; metadata: VectorMetadata }>> {
  try {
    const index = await getPineconeIndex();
    
    // Generate embedding for the query
    const { generateEmbedding } = await import("./embeddings");
    const queryEmbedding = await generateEmbedding(query);

    // Query Pinecone
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: {
        courseId: { $eq: courseId },
      },
    });

    // Format results
    return queryResponse.matches.map((match) => ({
      text: (match.metadata as VectorMetadata).text,
      score: match.score || 0,
      metadata: match.metadata as VectorMetadata,
    }));
  } catch (error) {
    console.error("Error querying vectors:", error);
    throw new Error("Failed to query vectors");
  }
}

export async function deleteDocumentVectors(
  fileName: string,
  courseId: string
): Promise<{ success: boolean }> {
  try {
    const index = await getPineconeIndex();
    
    // Delete all vectors for this document using metadata filter
    await index.deleteMany({
      filter: {
        fileName: fileName,
        courseId: courseId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting document vectors:", error);
    throw new Error("Failed to delete document vectors");
  }
}
