import PDFParser from "pdf2json";

export interface ProcessedDocument {
  text: string;
  chunks: EnhancedChunk[];
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    chunkCount: number;
  };
}

export interface EnhancedChunk {
  text: string;
  index: number;
  tokenCount: number;
  hasOverlap: boolean;
  metadata: {
    startChar: number;
    endChar: number;
    paragraphCount: number;
  };
}

export interface ChunkingConfig {
  chunkSize: number;        // Target tokens per chunk
  chunkOverlap: number;     // Overlap tokens between chunks
  minChunkSize: number;     // Minimum chunk size
  respectBoundaries: boolean; // Respect paragraph boundaries
}

const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 512,           // Optimal for embeddings
  chunkOverlap: 128,        // 25% overlap to preserve context
  minChunkSize: 100,        // Avoid tiny chunks
  respectBoundaries: true,  // Keep paragraphs together
};

export async function processDocument(
  file: Buffer,
  fileName: string,
  fileType: string
): Promise<ProcessedDocument> {
  let text = "";
  let pageCount: number | undefined;

  if (fileType === "application/pdf") {
    try {
      // Parse PDF using pdf2json
      const pdfParser = new PDFParser();
      
      const pdfText = await new Promise<string>((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", (errData: any) => {
          reject(new Error(errData.parserError));
        });
        
        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
          try {
            // Extract text from all pages
            const pages = pdfData.Pages || [];
            pageCount = pages.length;
            
            const allText = pages
              .map((page: any) => {
                const texts = page.Texts || [];
                return texts
                  .map((textItem: any) => {
                    try {
                      // Try to decode URI component, fallback to raw text if fails
                      return decodeURIComponent(textItem.R[0].T);
                    } catch (e) {
                      // If decoding fails, return the raw text
                      return textItem.R[0].T.replace(/%/g, ' ');
                    }
                  })
                  .join(" ");
              })
              .join("\n");
            
            resolve(allText);
          } catch (error) {
            reject(error);
          }
        });
        
        pdfParser.parseBuffer(file);
      });
      
      text = pdfText;
    } catch (error) {
      console.error("PDF parsing error:", error);
      throw new Error("Failed to parse PDF file");
    }
  } else if (fileType === "text/plain") {
    text = file.toString("utf-8");
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  // Clean the text
  text = text.replace(/\s+/g, " ").trim();

  // Split into chunks with overlap for better context preservation
  const chunks = chunkTextWithOverlap(text, DEFAULT_CHUNKING_CONFIG);

  return {
    text,
    chunks,
    metadata: {
      fileName,
      fileType,
      pageCount,
      chunkCount: chunks.length,
    },
  };
}

/**
 * Advanced chunking with overlap to prevent context loss
 * 
 * Strategy:
 * 1. Split by paragraphs first (respect semantic boundaries)
 * 2. Create chunks of ~512 tokens
 * 3. Add 128-token overlap between chunks (25%)
 * 4. Preserve paragraph integrity when possible
 * 5. Track metadata for each chunk
 */
function chunkTextWithOverlap(
  text: string,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): EnhancedChunk[] {
  const chunks: EnhancedChunk[] = [];
  
  // Split into paragraphs first to respect semantic boundaries
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  
  let currentChunk = "";
  let currentTokens = 0;
  let chunkIndex = 0;
  let previousChunkEnd = ""; // For overlap
  let startChar = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);
    
    // If paragraph alone exceeds chunk size, split it by sentences
    if (paragraphTokens > config.chunkSize) {
      // Save current chunk if exists
      if (currentChunk && currentTokens >= config.minChunkSize) {
        const chunkWithOverlap = previousChunkEnd + (previousChunkEnd ? " " : "") + currentChunk;
        chunks.push(createEnhancedChunk(chunkWithOverlap, chunkIndex++, startChar, chunkIndex > 0));
        previousChunkEnd = getLastNTokens(currentChunk, config.chunkOverlap);
        startChar += currentChunk.length;
        currentChunk = "";
        currentTokens = 0;
      }
      
      // Split large paragraph into sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence);
        
        if (currentTokens + sentenceTokens > config.chunkSize && currentChunk) {
          // Add overlap from previous chunk
          const chunkWithOverlap = previousChunkEnd + (previousChunkEnd ? " " : "") + currentChunk;
          chunks.push(createEnhancedChunk(chunkWithOverlap, chunkIndex++, startChar, chunkIndex > 0));
          
          // Prepare overlap for next chunk
          previousChunkEnd = getLastNTokens(currentChunk, config.chunkOverlap);
          startChar += currentChunk.length;
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence;
          currentTokens += sentenceTokens;
        }
      }
    } else {
      // Check if adding paragraph exceeds limit
      if (currentTokens + paragraphTokens > config.chunkSize && currentChunk) {
        // Save current chunk with overlap
        const chunkWithOverlap = previousChunkEnd + (previousChunkEnd ? " " : "") + currentChunk;
        chunks.push(createEnhancedChunk(chunkWithOverlap, chunkIndex++, startChar, chunkIndex > 0));
        
        // Prepare overlap for next chunk
        previousChunkEnd = getLastNTokens(currentChunk, config.chunkOverlap);
        startChar += currentChunk.length;
        currentChunk = paragraph;
        currentTokens = paragraphTokens;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        currentTokens += paragraphTokens;
      }
    }
  }
  
  // Add final chunk if it meets minimum size
  if (currentChunk && currentTokens >= config.minChunkSize) {
    const chunkWithOverlap = previousChunkEnd + (previousChunkEnd ? " " : "") + currentChunk;
    chunks.push(createEnhancedChunk(chunkWithOverlap, chunkIndex++, startChar, chunkIndex > 0));
  }
  
  return chunks;
}

/**
 * Create an enhanced chunk with metadata
 */
function createEnhancedChunk(
  text: string,
  index: number,
  startChar: number,
  hasOverlap: boolean
): EnhancedChunk {
  const trimmedText = text.trim();
  return {
    text: trimmedText,
    index,
    tokenCount: estimateTokenCount(trimmedText),
    hasOverlap,
    metadata: {
      startChar,
      endChar: startChar + trimmedText.length,
      paragraphCount: (trimmedText.match(/\n\n/g) || []).length + 1,
    },
  };
}

/**
 * Get the last N tokens from text for overlap
 */
function getLastNTokens(text: string, n: number): string {
  const words = text.split(/\s+/);
  const targetWords = Math.ceil(n / 1.3); // Rough word-to-token ratio
  return words.slice(-targetWords).join(" ");
}

/**
 * DEPRECATED: Old chunking method without overlap
 * Kept for reference but not used
 */
function chunkText(text: string, maxTokens: number = 500): string[] {
  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = "";
  let currentTokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokenCount = estimateTokenCount(sentence);

    if (currentTokenCount + sentenceTokenCount > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      currentTokenCount = sentenceTokenCount;
    } else {
      currentChunk += " " + sentence;
      currentTokenCount += sentenceTokenCount;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export function extractMetadata(fileName: string, fileSize: number) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  
  return {
    fileName,
    fileSize,
    extension,
    uploadedAt: new Date().toISOString(),
  };
}
