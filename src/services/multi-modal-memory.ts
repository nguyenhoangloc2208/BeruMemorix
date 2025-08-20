/**
 * Multi-modal Memory Support
 * Advanced memory system supporting text, images, audio, video, and structured data
 */

import type { MemoryTypeItem, MemoryContext } from "../types/memory-types.js";
import { promises as fs } from "fs";
import { join } from "path";

export type ModalityType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "structured"
  | "code"
  | "link"
  | "file";

export interface MultiModalContent {
  primary: {
    type: ModalityType;
    content: string; // Main content or reference
    metadata: Record<string, any>;
  };
  attachments: Array<{
    id: string;
    type: ModalityType;
    content: string; // Content or file path
    metadata: Record<string, any>;
    size: number; // Size in bytes
    mimeType?: string;
    description?: string;
  }>;
  relationships: Array<{
    fromId: string;
    toId: string;
    type: "references" | "contains" | "follows" | "contradicts" | "supports";
    strength: number; // 0-1
  }>;
}

export interface ModalityProcessor {
  type: ModalityType;
  process: (content: string, metadata?: any) => Promise<ProcessedContent>;
  extract: (content: string) => Promise<ExtractedFeatures>;
  search: (query: string, items: ProcessedContent[]) => Promise<SearchResult[]>;
  similarity: (
    content1: ProcessedContent,
    content2: ProcessedContent
  ) => number;
}

export interface ProcessedContent {
  id: string;
  type: ModalityType;
  originalContent: string;
  processedContent: string;
  features: ExtractedFeatures;
  metadata: Record<string, any>;
  searchableText: string; // Text representation for search
  processedAt: string;
}

export interface ExtractedFeatures {
  keywords: string[];
  entities: Array<{ name: string; type: string; confidence: number }>;
  topics: Array<{ name: string; weight: number }>;
  sentiment?: { score: number; label: string };
  language?: string;
  complexity?: number;
  structure?: any; // Type-specific structure
  embeddings?: number[]; // Vector embeddings if available
}

export interface SearchResult {
  contentId: string;
  relevance: number;
  matchedFeatures: string[];
  context: string;
}

export interface ModalityStats {
  totalItems: number;
  modalityDistribution: Record<ModalityType, number>;
  averageComplexity: number;
  topLanguages: Array<{ language: string; count: number }>;
  topTopics: Array<{ topic: string; weight: number }>;
  fileStorage: {
    totalSize: number; // bytes
    averageSize: number;
    largestFile: { id: string; size: number; type: ModalityType };
  };
  processingStats: {
    processedToday: number;
    averageProcessingTime: number;
    errorRate: number;
  };
}

export class MultiModalMemorySystem {
  private processors: Map<ModalityType, ModalityProcessor> = new Map();
  private processedContent: Map<string, ProcessedContent> = new Map();
  private fileStorage: string;
  private processingQueue: Array<{
    id: string;
    content: string;
    type: ModalityType;
    priority: number;
    queuedAt: string;
  }> = [];

  // Configuration
  private config = {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    supportedTypes: [
      "text",
      "image",
      "audio",
      "video",
      "document",
      "structured",
      "code",
      "link",
      "file",
    ] as ModalityType[],
    processingTimeout: 30000, // 30 seconds
    maxQueueSize: 100,
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
  };

  constructor(fileStoragePath: string = "data/multimodal") {
    this.fileStorage = fileStoragePath;
    this.initializeProcessors();
    this.startPeriodicCleanup();
    console.log("🎭 Multi-modal memory system initialized");
  }

  /**
   * Store multi-modal content
   */
  async storeMultiModalContent(
    content: MultiModalContent,
    context: MemoryContext
  ): Promise<string> {
    const contentId = this.generateContentId();

    try {
      // Process primary content
      const primaryProcessor = this.processors.get(content.primary.type);
      if (!primaryProcessor) {
        throw new Error(`Unsupported modality type: ${content.primary.type}`);
      }

      const processedPrimary = await primaryProcessor.process(
        content.primary.content,
        content.primary.metadata
      );
      processedPrimary.id = contentId;

      // Process attachments
      const processedAttachments = [];
      for (const attachment of content.attachments) {
        const processor = this.processors.get(attachment.type);
        if (processor) {
          try {
            const processed = await processor.process(
              attachment.content,
              attachment.metadata
            );
            processed.id = attachment.id;
            processedAttachments.push(processed);
          } catch (error) {
            console.warn(
              `Failed to process attachment ${attachment.id}:`,
              error
            );
          }
        }
      }

      // Store processed content
      this.processedContent.set(contentId, processedPrimary);
      for (const attachment of processedAttachments) {
        this.processedContent.set(attachment.id, attachment);
      }

      // Save to file storage if needed
      await this.saveToFileStorage(contentId, {
        primary: processedPrimary,
        attachments: processedAttachments,
        relationships: content.relationships,
        context,
        createdAt: new Date().toISOString(),
      });

      console.log(
        `📁 Stored multi-modal content: ${contentId} (${content.primary.type})`
      );
      return contentId;
    } catch (error) {
      console.error(`Failed to store multi-modal content:`, error);
      throw error;
    }
  }

  /**
   * Search across all modalities
   */
  async searchMultiModal(
    query: string,
    options: {
      modalities?: ModalityType[];
      limit?: number;
      includeAttachments?: boolean;
      semanticSearch?: boolean;
    } = {}
  ): Promise<
    Array<{
      contentId: string;
      type: ModalityType;
      relevance: number;
      matchedContent: string;
      context: any;
    }>
  > {
    const results: Array<{
      contentId: string;
      type: ModalityType;
      relevance: number;
      matchedContent: string;
      context: any;
    }> = [];

    const targetModalities = options.modalities || this.config.supportedTypes;
    const processedItems = Array.from(this.processedContent.values());

    for (const modality of targetModalities) {
      const processor = this.processors.get(modality);
      if (!processor) continue;

      const modalityItems = processedItems.filter(
        (item) => item.type === modality
      );
      if (modalityItems.length === 0) continue;

      try {
        const searchResults = await processor.search(query, modalityItems);

        for (const result of searchResults) {
          const item = this.processedContent.get(result.contentId);
          if (item) {
            results.push({
              contentId: result.contentId,
              type: item.type,
              relevance: result.relevance,
              matchedContent: result.context,
              context: item.metadata,
            });
          }
        }
      } catch (error) {
        console.warn(`Search failed for modality ${modality}:`, error);
      }
    }

    // Sort by relevance and apply limit
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, options.limit || 50);
  }

  /**
   * Find similar content across modalities
   */
  async findSimilarContent(
    contentId: string,
    options: {
      crossModal?: boolean;
      threshold?: number;
      limit?: number;
    } = {}
  ): Promise<
    Array<{
      contentId: string;
      similarity: number;
      type: ModalityType;
    }>
  > {
    const targetContent = this.processedContent.get(contentId);
    if (!targetContent) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const results = [];
    const threshold = options.threshold || 0.5;
    const targetTypes = options.crossModal
      ? this.config.supportedTypes
      : [targetContent.type];

    for (const [id, content] of this.processedContent.entries()) {
      if (id === contentId) continue;
      if (!targetTypes.includes(content.type)) continue;

      const processor = this.processors.get(content.type);
      if (!processor) continue;

      try {
        const similarity = processor.similarity(targetContent, content);

        if (similarity >= threshold) {
          results.push({
            contentId: id,
            similarity,
            type: content.type,
          });
        }
      } catch (error) {
        console.warn(`Similarity calculation failed for ${id}:`, error);
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, options.limit || 20);
  }

  /**
   * Get content by ID with full details
   */
  async getMultiModalContent(contentId: string): Promise<{
    primary: ProcessedContent;
    attachments: ProcessedContent[];
    relationships: any[];
    context: any;
  } | null> {
    try {
      const stored = await this.loadFromFileStorage(contentId);
      return stored;
    } catch (error) {
      console.warn(`Failed to load content ${contentId}:`, error);
      return null;
    }
  }

  /**
   * Get modality statistics
   */
  getModalityStats(): ModalityStats {
    const items = Array.from(this.processedContent.values());

    const modalityDistribution = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<ModalityType, number>);

    const complexities = items
      .map((item) => item.features.complexity || 0)
      .filter((c) => c > 0);

    const averageComplexity =
      complexities.length > 0
        ? complexities.reduce((sum, c) => sum + c, 0) / complexities.length
        : 0;

    const languages = items
      .map((item) => item.features.language)
      .filter(Boolean)
      .reduce((acc, lang) => {
        acc[lang!] = (acc[lang!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topLanguages = Object.entries(languages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([language, count]) => ({ language, count }));

    const topics = items
      .flatMap((item) => item.features.topics || [])
      .reduce((acc, topic) => {
        acc[topic.name] = (acc[topic.name] || 0) + topic.weight;
        return acc;
      }, {} as Record<string, number>);

    const topTopics = Object.entries(topics)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, weight]) => ({ topic, weight }));

    return {
      totalItems: items.length,
      modalityDistribution,
      averageComplexity,
      topLanguages,
      topTopics,
      fileStorage: {
        totalSize: 0, // Would calculate from actual files
        averageSize: 0,
        largestFile: { id: "", size: 0, type: "text" },
      },
      processingStats: {
        processedToday: 0, // Would track daily processing
        averageProcessingTime: 0,
        errorRate: 0,
      },
    };
  }

  /**
   * Queue content for background processing
   */
  async queueForProcessing(
    content: string,
    type: ModalityType,
    priority: number = 0.5
  ): Promise<string> {
    if (this.processingQueue.length >= this.config.maxQueueSize) {
      throw new Error("Processing queue is full");
    }

    const id = this.generateContentId();
    this.processingQueue.push({
      id,
      content,
      type,
      priority,
      queuedAt: new Date().toISOString(),
    });

    // Process immediately if high priority
    if (priority > 0.8) {
      await this.processQueueItem(id);
    }

    return id;
  }

  /**
   * Initialize built-in processors
   */
  private initializeProcessors(): void {
    // Text processor
    this.processors.set("text", {
      type: "text",
      process: async (content: string, metadata?: any) => {
        const features = await this.extractTextFeatures(content);
        return {
          id: this.generateContentId(),
          type: "text",
          originalContent: content,
          processedContent: content.toLowerCase().trim(),
          features,
          metadata: metadata || {},
          searchableText: content,
          processedAt: new Date().toISOString(),
        };
      },
      extract: async (content: string) => this.extractTextFeatures(content),
      search: async (query: string, items: ProcessedContent[]) => {
        return items
          .map((item) => ({
            contentId: item.id,
            relevance: this.calculateTextRelevance(query, item.searchableText),
            matchedFeatures: this.findMatchedKeywords(
              query,
              item.features.keywords
            ),
            context: item.searchableText.substring(0, 200),
          }))
          .filter((result) => result.relevance > 0.1);
      },
      similarity: (content1: ProcessedContent, content2: ProcessedContent) => {
        return this.calculateTextSimilarity(
          content1.searchableText,
          content2.searchableText
        );
      },
    });

    // Code processor
    this.processors.set("code", {
      type: "code",
      process: async (content: string, metadata?: any) => {
        const features = await this.extractCodeFeatures(content);
        return {
          id: this.generateContentId(),
          type: "code",
          originalContent: content,
          processedContent: content,
          features,
          metadata: metadata || {},
          searchableText: this.extractCodeText(content),
          processedAt: new Date().toISOString(),
        };
      },
      extract: async (content: string) => this.extractCodeFeatures(content),
      search: async (query: string, items: ProcessedContent[]) => {
        return items
          .map((item) => ({
            contentId: item.id,
            relevance: this.calculateCodeRelevance(query, item),
            matchedFeatures: [],
            context: item.originalContent.substring(0, 300),
          }))
          .filter((result) => result.relevance > 0.1);
      },
      similarity: (content1: ProcessedContent, content2: ProcessedContent) => {
        return this.calculateCodeSimilarity(
          content1.originalContent,
          content2.originalContent
        );
      },
    });

    // Document processor
    this.processors.set("document", {
      type: "document",
      process: async (content: string, metadata?: any) => {
        const features = await this.extractDocumentFeatures(content, metadata);
        return {
          id: this.generateContentId(),
          type: "document",
          originalContent: content,
          processedContent: this.normalizeDocument(content),
          features,
          metadata: metadata || {},
          searchableText: this.extractDocumentText(content),
          processedAt: new Date().toISOString(),
        };
      },
      extract: async (content: string) => this.extractDocumentFeatures(content),
      search: async (query: string, items: ProcessedContent[]) => {
        return items
          .map((item) => ({
            contentId: item.id,
            relevance: this.calculateDocumentRelevance(query, item),
            matchedFeatures: [],
            context: item.searchableText.substring(0, 200),
          }))
          .filter((result) => result.relevance > 0.1);
      },
      similarity: (content1: ProcessedContent, content2: ProcessedContent) => {
        return this.calculateDocumentSimilarity(content1, content2);
      },
    });

    // Link processor
    this.processors.set("link", {
      type: "link",
      process: async (content: string, metadata?: any) => {
        const features = await this.extractLinkFeatures(content);
        return {
          id: this.generateContentId(),
          type: "link",
          originalContent: content,
          processedContent: content,
          features,
          metadata: metadata || {},
          searchableText: features.keywords.join(" "),
          processedAt: new Date().toISOString(),
        };
      },
      extract: async (content: string) => this.extractLinkFeatures(content),
      search: async (query: string, items: ProcessedContent[]) => {
        return items
          .map((item) => ({
            contentId: item.id,
            relevance: this.calculateLinkRelevance(query, item),
            matchedFeatures: [],
            context: item.originalContent,
          }))
          .filter((result) => result.relevance > 0.1);
      },
      similarity: (content1: ProcessedContent, content2: ProcessedContent) => {
        return this.calculateLinkSimilarity(
          content1.originalContent,
          content2.originalContent
        );
      },
    });

    console.log(`📋 Initialized ${this.processors.size} modality processors`);
  }

  // Feature extraction methods
  private async extractTextFeatures(
    content: string
  ): Promise<ExtractedFeatures> {
    const words = content
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);
    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const keywords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return {
      keywords,
      entities: this.extractEntities(content),
      topics: this.extractTopics(content),
      sentiment: this.analyzeSentiment(content),
      language: this.detectLanguage(content),
      complexity: this.calculateTextComplexity(content),
    };
  }

  private async extractCodeFeatures(
    content: string
  ): Promise<ExtractedFeatures> {
    const keywords = this.extractCodeKeywords(content);
    const structure = this.analyzeCodeStructure(content);

    return {
      keywords,
      entities: [],
      topics: [{ name: structure.language || "unknown", weight: 1.0 }],
      language: structure.language,
      complexity: structure.complexity,
      structure,
    };
  }

  private async extractDocumentFeatures(
    content: string,
    metadata?: any
  ): Promise<ExtractedFeatures> {
    const textFeatures = await this.extractTextFeatures(content);

    return {
      ...textFeatures,
      structure: {
        format: metadata?.format || "text",
        pageCount: metadata?.pageCount || 1,
        wordCount: content.split(/\s+/).length,
      },
    };
  }

  private async extractLinkFeatures(url: string): Promise<ExtractedFeatures> {
    const domain = this.extractDomain(url);
    const path = this.extractPath(url);

    return {
      keywords: [domain, ...path.split("/").filter(Boolean)],
      entities: [{ name: domain, type: "domain", confidence: 1.0 }],
      topics: [{ name: this.categorizeDomain(domain), weight: 0.8 }],
      structure: {
        domain,
        path,
        protocol: url.startsWith("https") ? "https" : "http",
      },
    };
  }

  // Helper methods for feature extraction
  private extractEntities(
    content: string
  ): Array<{ name: string; type: string; confidence: number }> {
    // Simple entity extraction (in production would use NLP library)
    const entities = [];

    // Extract email addresses
    const emails =
      content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) ||
      [];
    emails.forEach((email) => {
      entities.push({ name: email, type: "email", confidence: 0.9 });
    });

    // Extract URLs
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    urls.forEach((url) => {
      entities.push({ name: url, type: "url", confidence: 0.9 });
    });

    return entities;
  }

  private extractTopics(
    content: string
  ): Array<{ name: string; weight: number }> {
    // Simple topic extraction based on keyword frequency
    const topicKeywords = {
      technology: [
        "code",
        "programming",
        "software",
        "development",
        "tech",
        "computer",
      ],
      business: [
        "business",
        "market",
        "company",
        "revenue",
        "profit",
        "strategy",
      ],
      science: [
        "research",
        "study",
        "analysis",
        "data",
        "experiment",
        "theory",
      ],
      education: [
        "learn",
        "study",
        "course",
        "education",
        "training",
        "knowledge",
      ],
    };

    const topics = [];
    const contentLower = content.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      let weight = 0;
      for (const keyword of keywords) {
        const matches = (contentLower.match(new RegExp(keyword, "g")) || [])
          .length;
        weight += matches;
      }

      if (weight > 0) {
        topics.push({
          name: topic,
          weight: weight / content.split(/\s+/).length,
        });
      }
    }

    return topics.sort((a, b) => b.weight - a.weight);
  }

  private analyzeSentiment(content: string): { score: number; label: string } {
    // Simple sentiment analysis
    const positiveWords = [
      "good",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "horrible",
      "disappointing",
      "poor",
    ];

    const contentLower = content.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      score += (contentLower.match(new RegExp(word, "g")) || []).length;
    });

    negativeWords.forEach((word) => {
      score -= (contentLower.match(new RegExp(word, "g")) || []).length;
    });

    const normalizedScore = Math.max(-1, Math.min(1, score / 10));
    const label =
      normalizedScore > 0.1
        ? "positive"
        : normalizedScore < -0.1
        ? "negative"
        : "neutral";

    return { score: normalizedScore, label };
  }

  private detectLanguage(content: string): string {
    // Simple language detection (in production would use proper language detection)
    const englishWords = [
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
    ];
    const englishCount = englishWords.reduce((count, word) => {
      return (
        count +
        (content.toLowerCase().match(new RegExp(`\\b${word}\\b`, "g")) || [])
          .length
      );
    }, 0);

    return englishCount > 5 ? "en" : "unknown";
  }

  private calculateTextComplexity(content: string): number {
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // Simple complexity score based on sentence length and word length
    return Math.min(avgWordsPerSentence / 20 + avgWordLength / 10, 1);
  }

  // More helper methods
  private extractCodeKeywords(code: string): string[] {
    const keywords = [];

    // Extract function names
    const functionMatches =
      code.match(/function\s+(\w+)|(\w+)\s*=\s*\(|class\s+(\w+)/g) || [];
    keywords.push(...functionMatches);

    // Extract variable names
    const varMatches = code.match(/(?:var|let|const)\s+(\w+)/g) || [];
    keywords.push(...varMatches);

    return keywords.slice(0, 20);
  }

  private analyzeCodeStructure(code: string): any {
    const lines = code.split("\n").length;
    const functions = (code.match(/function\s+\w+/g) || []).length;
    const classes = (code.match(/class\s+\w+/g) || []).length;

    let language = "unknown";
    if (
      code.includes("function") ||
      code.includes("const") ||
      code.includes("let")
    ) {
      language = "javascript";
    } else if (code.includes("def ") || code.includes("import ")) {
      language = "python";
    } else if (code.includes("public class") || code.includes("private ")) {
      language = "java";
    }

    return {
      language,
      lines,
      functions,
      classes,
      complexity: Math.min(lines / 100, 1),
    };
  }

  private extractCodeText(code: string): string {
    // Extract comments and string literals for search
    const comments = code.match(/\/\/.*|\/\*[\s\S]*?\*\/|#.*/g) || [];
    const strings = code.match(/"[^"]*"|'[^']*'/g) || [];
    return [...comments, ...strings].join(" ");
  }

  private normalizeDocument(content: string): string {
    return content.trim().replace(/\s+/g, " ");
  }

  private extractDocumentText(content: string): string {
    // Extract plain text from document content
    return content.replace(/<[^>]*>/g, "").trim(); // Remove HTML tags if present
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url.split("/")[0];
    }
  }

  private extractPath(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url.substring(url.indexOf("/"));
    }
  }

  private categorizeDomain(domain: string): string {
    if (domain.includes("github") || domain.includes("gitlab")) return "code";
    if (domain.includes("stackoverflow") || domain.includes("docs"))
      return "documentation";
    if (domain.includes("youtube") || domain.includes("video")) return "video";
    if (domain.includes("wiki")) return "reference";
    return "web";
  }

  // Similarity calculation methods
  private calculateTextRelevance(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    let matches = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        matches++;
      }
    }

    return matches / queryWords.length;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private calculateCodeRelevance(
    query: string,
    item: ProcessedContent
  ): number {
    const queryLower = query.toLowerCase();
    const content = item.originalContent.toLowerCase();

    // Check for exact matches in code
    if (content.includes(queryLower)) return 0.9;

    // Check for keyword matches
    const matches = item.features.keywords.filter(
      (keyword) =>
        keyword.toLowerCase().includes(queryLower) ||
        queryLower.includes(keyword.toLowerCase())
    );

    return matches.length / Math.max(item.features.keywords.length, 1);
  }

  private calculateCodeSimilarity(code1: string, code2: string): number {
    // Simple structural similarity
    const normalize = (code: string) =>
      code.replace(/\s+/g, "").replace(/[{}();]/g, "");
    const norm1 = normalize(code1);
    const norm2 = normalize(code2);

    if (norm1.length === 0 || norm2.length === 0) return 0;

    let matches = 0;
    const minLength = Math.min(norm1.length, norm2.length);

    for (let i = 0; i < minLength; i++) {
      if (norm1[i] === norm2[i]) matches++;
    }

    return matches / Math.max(norm1.length, norm2.length);
  }

  private calculateDocumentRelevance(
    query: string,
    item: ProcessedContent
  ): number {
    return this.calculateTextRelevance(query, item.searchableText);
  }

  private calculateDocumentSimilarity(
    doc1: ProcessedContent,
    doc2: ProcessedContent
  ): number {
    return this.calculateTextSimilarity(
      doc1.searchableText,
      doc2.searchableText
    );
  }

  private calculateLinkRelevance(
    query: string,
    item: ProcessedContent
  ): number {
    const queryLower = query.toLowerCase();
    const url = item.originalContent.toLowerCase();

    if (url.includes(queryLower)) return 0.8;

    const domain = this.extractDomain(url);
    if (domain.includes(queryLower)) return 0.6;

    return 0;
  }

  private calculateLinkSimilarity(url1: string, url2: string): number {
    const domain1 = this.extractDomain(url1);
    const domain2 = this.extractDomain(url2);

    if (domain1 === domain2) return 0.8;

    const path1 = this.extractPath(url1);
    const path2 = this.extractPath(url2);

    return this.calculateTextSimilarity(path1, path2) * 0.4;
  }

  private findMatchedKeywords(query: string, keywords: string[]): string[] {
    const queryLower = query.toLowerCase();
    return keywords.filter(
      (keyword) =>
        keyword.toLowerCase().includes(queryLower) ||
        queryLower.includes(keyword.toLowerCase())
    );
  }

  // Storage methods
  private async saveToFileStorage(contentId: string, data: any): Promise<void> {
    try {
      await fs.mkdir(this.fileStorage, { recursive: true });
      const filePath = join(this.fileStorage, `${contentId}.json`);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn(`Failed to save to file storage:`, error);
    }
  }

  private async loadFromFileStorage(contentId: string): Promise<any> {
    const filePath = join(this.fileStorage, `${contentId}.json`);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  }

  private async processQueueItem(id: string): Promise<void> {
    const itemIndex = this.processingQueue.findIndex((item) => item.id === id);
    if (itemIndex === -1) return;

    const item = this.processingQueue[itemIndex];
    this.processingQueue.splice(itemIndex, 1);

    try {
      const processor = this.processors.get(item.type);
      if (processor) {
        const processed = await processor.process(item.content);
        processed.id = item.id;
        this.processedContent.set(item.id, processed);
      }
    } catch (error) {
      console.error(`Failed to process queued item ${id}:`, error);
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldContent();
    }, this.config.cleanupInterval);
  }

  private cleanupOldContent(): void {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const [id, content] of this.processedContent.entries()) {
      const processedAt = new Date(content.processedAt).getTime();
      if (processedAt < cutoff) {
        this.processedContent.delete(id);
      }
    }
  }

  private generateContentId(): string {
    return (
      "mm_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    );
  }
}
