import PDFParser from "pdf2json";

export interface ProcessedDocument {
  text: string;
  chunks: string[];
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    chunkCount: number;
  };
}

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

  // Split into chunks (approximately 500 tokens per chunk)
  const chunks = chunkText(text, 500);

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
