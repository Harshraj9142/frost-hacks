import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient: Pinecone | null = null;

export async function getPineconeClient() {
  if (pineconeClient) {
    return pineconeClient;
  }

  if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is not set");
  }

  pineconeClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });

  return pineconeClient;
}

export async function getPineconeIndex(indexName: string = "rag-tutor") {
  const client = await getPineconeClient();
  return client.index(indexName);
}
