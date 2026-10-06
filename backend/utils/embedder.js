const { pipeline } = require('@xenova/transformers');

let embedderPipeline = null;

async function getEmbedder() {
  if (!embedderPipeline) {
    // Using a fast, lightweight ONNX model for embeddings (runs 100% locally)
    embedderPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedderPipeline;
}

/**
 * Convert text into a JSON array vector embedding (384 dimensions)
 */
async function generateEmbedding(text) {
  if (!text || text.trim() === '') return null;
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Pure Math: Cosine Similarity between two mathematical vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { generateEmbedding, cosineSimilarity };
