import { getPineconeIndex } from "./pinecone";
import { generateEmbeddings } from "./embeddings";
import { v4 as uuidv4 } from "uuid";
import type { EnhancedChunk } from "./document-processor";

export interface VectorMetadata {
  text: string;
  fileName: string;
  fileType: string;
  courseId: string;
  facultyId: string;
  chunkIndex: number;
  uploadedAt: string;
  tokenCount?: number;
  hasOverlap?: boolean;
  pageNumber?: number;      // Single page number
  pageNumbers?: string;     // Comma-separated page numbers (e.g., "1,2,3")
}

export async function indexDocument(
  chunks: EnhancedChunk[],
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
    const chunkTexts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddings(chunkTexts);
    
    // Prepare vectors for upsert with enhanced metadata
    const vectors = chunks.map((chunk, i) => ({
      id: uuidv4(),
      values: embeddings[i],
      metadata: {
        text: chunk.text,
        fileName: metadata.fileName,
        fileType: metadata.fileType,
        courseId: metadata.courseId,
        facultyId: metadata.facultyId,
        chunkIndex: chunk.index,
        tokenCount: chunk.tokenCount,
        hasOverlap: chunk.hasOverlap,
        pageNumber: chunk.metadata.pageNumber,
        pageNumbers: chunk.metadata.pageNumbers 
          ? chunk.metadata.pageNumbers.join(',') 
          : undefined,
        uploadedAt: new Date().toISOString(),
      } as any,
    }));

    // Upsert vectors in batches of 100
    const batchSize = 100;
    const vectorIds: string[] = [];

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert({ records: batch });
      vectorIds.push(...batch.map((v) => v.id));
    }

    console.log(`Indexed ${chunks.length} chunks with overlap for ${metadata.fileName}`);
    return { success: true, vectorIds };
  } catch (error) {
    console.error("Error indexing document:", error);
    throw new Error("Failed to index document");
  }
}

export async function queryVectors(
  query: string,
  courseId: string,
  topK: number = 5,
  focusedDocumentId?: string
): Promise<Array<{ text: string; score: number; metadata: VectorMetadata }>> {
  try {
    const index = await getPineconeIndex();
    
    // Generate embedding for the query
    const { generateEmbedding } = await import("./embeddings");
    const queryEmbedding = await generateEmbedding(query);

    // Build filter
    const filter: any = {
      courseId: { $eq: courseId },
    };

    // If focused on a specific document, add document filter
    if (focusedDocumentId) {
      // Get document details to filter by fileName
      const connectDB = (await import("./mongodb")).default;
      const DocumentModel = (await import("@/models/Document")).default;
      await connectDB();
      
      const document = await DocumentModel.findById(focusedDocumentId).select("fileName");
      if (document) {
        filter.fileName = { $eq: document.fileName };
      }
    }

    // Query Pinecone
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter,
    });

    // Format results
    return queryResponse.matches.map((match) => ({
      text: (match.metadata as any).text,
      score: match.score || 0,
      metadata: match.metadata as any as VectorMetadata,
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
