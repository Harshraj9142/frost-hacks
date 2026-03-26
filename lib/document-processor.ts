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
    pageNumber?: number;        // PDF page number
    pageNumbers?: number[];     // Multiple pages if chunk spans pages
  };
}

export interface ChunkingConfig {
  chunkSize: number;        // Target tokens per chunk
  chunkOverlap: number;     // Overlap tokens between chunks
  minChunkSize: number;     // Minimum chunk size
  respectBoundaries: boolean; // Respect paragraph boundaries
}

const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 600,           // Increased for better context
  chunkOverlap: 150,        // 25% overlap to preserve context
  minChunkSize: 150,        // Avoid tiny chunks
  respectBoundaries: true,  // Keep paragraphs together
};

export async function processDocument(
  file: Buffer,
  fileName: string,
  fileType: string
): Promise<ProcessedDocument> {
  let text = "";
  let pageCount: number | undefined;
  let pageBreaks: number[] = []; // Track character positions of page breaks

  if (fileType === "application/pdf") {
    try {
      // Parse PDF using pdf2json
      const pdfParser = new PDFParser();
      
      const result = await new Promise<{ text: string; pageBreaks: number[] }>((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", (errData: any) => {
          reject(new Error(errData.parserError));
        });
        
        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
          try {
            // Extract text from all pages with page tracking
            const pages = pdfData.Pages || [];
            pageCount = pages.length;
            
            let allText = "";
            const breaks: number[] = [];
            
            pages.forEach((page: any, pageIndex: number) => {
              const texts = page.Texts || [];
              const pageText = texts
                .map((textItem: any) => {
                  try {
                    return decodeURIComponent(textItem.R[0].T);
                  } catch (e) {
                    return textItem.R[0].T.replace(/%/g, ' ');
                  }
                })
                .join(" ");
              
              // Track page break position
              if (pageIndex > 0) {
                breaks.push(allText.length);
              }
              
              allText += pageText + "\n";
            });
            
            resolve({ text: allText, pageBreaks: breaks });
          } catch (error) {
            reject(error);
          }
        });
        
        pdfParser.parseBuffer(file);
      });
      
      text = result.text;
      pageBreaks = result.pageBreaks;
    } catch (error) {
      console.error("PDF parsing error:", error);
      throw new Error("Failed to parse PDF file");
    }
  } else if (fileType === "text/plain") {
    text = file.toString("utf-8");
    // For text files, no page breaks
    pageBreaks = [];
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  // Clean and normalize the text for better accuracy
  text = cleanText(text);

  // Split into chunks with overlap and page tracking
  const chunks = chunkTextWithOverlap(text, DEFAULT_CHUNKING_CONFIG, pageBreaks, pageCount);

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
 * Clean and normalize text for better processing
 */
function cleanText(text: string): string {
  // Remove excessive whitespace
  text = text.replace(/\s+/g, " ");
  
  // Fix common OCR errors
  text = text.replace(/\s+([.,!?;:])/g, "$1"); // Remove space before punctuation
  text = text.replace(/([.,!?;:])\s*([.,!?;:])/g, "$1 "); // Fix double punctuation
  
  // Normalize quotes
  text = text.replace(/[""]/g, '"');
  text = text.replace(/['']/g, "'");
  
  // Remove page numbers and headers/footers (common patterns)
  text = text.replace(/^\s*\d+\s*$/gm, ""); // Standalone page numbers
  text = text.replace(/^Page \d+.*$/gm, ""); // "Page X" patterns
  
  // Remove excessive newlines but preserve paragraph breaks
  text = text.replace(/\n{3,}/g, "\n\n");
  
  // Trim and return
  return text.trim();
}

/**
 * Advanced chunking with overlap to prevent context loss
 * 
 * Strategy:
 * 1. Split by paragraphs first (respect semantic boundaries)
 * 2. Create chunks of ~600 tokens
 * 3. Add 150-token overlap between chunks (25%)
 * 4. Preserve paragraph integrity when possible
 * 5. Track metadata for each chunk including page numbers
 * 6. Ensure chunks have complete sentences
 */
function chunkTextWithOverlap(
  text: string,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG,
  pageBreaks: number[] = [],
  totalPages?: number
): EnhancedChunk[] {
  const chunks: EnhancedChunk[] = [];
  
  // Split into paragraphs first to respect semantic boundaries
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  let currentChunk = "";
  let currentTokens = 0;
  let chunkIndex = 0;
  let previousChunkEnd = ""; // For overlap
  let startChar = 0;
  let paragraphCount = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    const paragraphTokens = estimateTokenCount(paragraph);
    
    // If paragraph alone exceeds chunk size, split it by sentences
    if (paragraphTokens > config.chunkSize) {
      // Save current chunk if exists
      if (currentChunk && currentTokens >= config.minChunkSize) {
        const chunkWithOverlap = previousChunkEnd + (previousChunkEnd ? "\n\n" : "") + currentChunk;
        const chunkStartChar = startChar - previousChunkEnd.length;
        const pageInfo = getPageNumbers(chunkStartChar, chunkStartChar + chunkWithOverlap.length, pageBreaks, totalPages);
        chunks.push(createEnhancedChunk(chunkWithOverlap, chunkIndex++, chunkStartChar, chunkIndex > 0, pageInfo, paragraphCount));
        previousChunkEnd = getLastNTokens(currentChunk, config.chunkOverlap);
        startChar += currentChunk.length + 2; // +2 for \n\n
        currentChunk = "";
        currentTokens = 0;
        paragraphCount = 0;
      }
      
      // Split large paragraph into sentences
      const sentences = paragraph.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [paragraph];
      
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence);
        
        if (currentTokens + sentenceTokens > config.chunkSize && currentChunk) {
          // Add overlap from previous chunk
          const chunkWithOverlap = previousChunkEnd + (previousChunkEnd ? " " : "") + currentChunk;
          const chunkStartChar = startChar - previousChunkEnd.length;
          const pageInfo = getPageNumbers(chunkStartChar, chunkStartChar + chunkWithOverlap.length, pageBreaks, totalPages);
          chunks.push(createEnhancedChunk(chunkWithOverlap, chunkIndex++, chunkStartChar, chunkIndex > 0, pageInfo, paragraphCount));
          
          // Prepare overlap for next chunk
          previousChunkEnd = getLastNTokens(currentChunk, config.chunkOverlap);
          startChar += currentChunk.length + 1; // +1 for space
          currentChunk = sentence.trim();
          currentTokens = sentenceTokens;
          paragraphCount = 0;
        } else {
          currentChunk += (currentChunk ? " " : "") + sentence.trim();
          currentTokens += sentenceTokens;
        }
      }
      paragraphCount++;
    } else {
      // Check if adding paragraph exceeds limit
      if (currentTokens + paragraphTokens > config.chunkSize && currentChunk) {
        // Save current chunk with overlap
        const chunkWithOverlap = previousChunkEnd + (previousChunkEnd ? "\n\n" : "") + currentChunk;
        const chunkStartChar = startChar - previousChunkEnd.length;
        const pageInfo = getPageNumbers(chunkStartChar, chunkStartChar + chunkWithOverlap.length, pageBreaks, totalPages);
        chunks.push(createEnhancedChunk(chunkWithOverlap, chunkIndex++, chunkStartChar, chunkIndex > 0, pageInfo, paragraphCount));
        
        // Prepare overlap for next chunk
        previousChunkEnd = getLastNTokens(currentChunk, config.chunkOverlap);
        startChar += currentChunk.length + 2; // +2 for \n\n
        currentChunk = paragraph;
        currentTokens = paragraphTokens;
        paragraphCount = 1;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        currentTokens += paragraphTokens;
        paragraphCount++;
      }
    }
  }
  
  // Add final chunk if it meets minimum size
  if (currentChunk && currentTokens >= config.minChunkSize) {
    const chunkWithOverlap = previousChunkEnd + (previousChunkEnd ? "\n\n" : "") + currentChunk;
    const chunkStartChar = startChar - previousChunkEnd.length;
    const pageInfo = getPageNumbers(chunkStartChar, chunkStartChar + chunkWithOverlap.length, pageBreaks, totalPages);
    chunks.push(createEnhancedChunk(chunkWithOverlap, chunkIndex++, chunkStartChar, chunkIndex > 0, pageInfo, paragraphCount));
  }
  
  console.log(`Created ${chunks.length} chunks with average size ${Math.round(chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length)} tokens`);
  
  return chunks;
}

/**
 * Determine which page(s) a chunk belongs to
 */
function getPageNumbers(
  startChar: number,
  endChar: number,
  pageBreaks: number[],
  totalPages?: number
): { pageNumber?: number; pageNumbers?: number[] } {
  if (!pageBreaks || pageBreaks.length === 0 || !totalPages) {
    return {}; // No page info for non-PDF files
  }
  
  const pages: number[] = [];
  
  // Determine which pages this chunk spans
  for (let i = 0; i <= pageBreaks.length; i++) {
    const pageStart = i === 0 ? 0 : pageBreaks[i - 1];
    const pageEnd = i === pageBreaks.length ? Infinity : pageBreaks[i];
    
    // Check if chunk overlaps with this page
    if (startChar < pageEnd && endChar > pageStart) {
      pages.push(i + 1); // Page numbers are 1-indexed
    }
  }
  
  if (pages.length === 1) {
    return { pageNumber: pages[0] };
  } else if (pages.length > 1) {
    return { pageNumbers: pages };
  }
  
  return {};
}

/**
 * Create an enhanced chunk with metadata including page numbers
 */
function createEnhancedChunk(
  text: string,
  index: number,
  startChar: number,
  hasOverlap: boolean,
  pageInfo: { pageNumber?: number; pageNumbers?: number[] },
  paragraphCount: number = 1
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
      paragraphCount,
      ...pageInfo,
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
