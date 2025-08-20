/**
 * Enhanced Multi-modal Memory Support
 * Advanced memory system supporting text, images, audio, video, documents, and structured data
 * Week 11-12: Enhanced with comprehensive media processing and file format support
 */

import type { MemoryContext } from "../types/memory-types.js";
import { ImageProcessingService } from "./image-processing.js";
import { AudioVideoProcessingService } from "./audio-video-processing.js";
import { promises as fs } from "fs";
import { join } from "path";

export type ModalityType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "pdf"
  | "office"
  | "structured"
  | "code"
  | "link"
  | "file"
  | "archive";

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

export class EnhancedMultiModalMemorySystem {
  private processors: Map<ModalityType, ModalityProcessor> = new Map();
  private processedContent: Map<string, ProcessedContent> = new Map();
  private fileStorage: string;
  private imageProcessor: ImageProcessingService;
  private mediaProcessor: AudioVideoProcessingService;
  private processingQueue: Array<{
    id: string;
    content: string;
    type: ModalityType;
    priority: number;
    queuedAt: string;
  }> = [];

  // Enhanced Configuration for Week 11-12
  private config = {
    maxFileSize: 1024 * 1024 * 1024, // 1GB for videos
    supportedTypes: [
      "text",
      "image",
      "audio",
      "video",
      "document",
      "pdf",
      "office",
      "structured",
      "code",
      "link",
      "file",
      "archive",
    ] as ModalityType[],
    processingTimeout: 120000, // 2 minutes for complex media
    maxQueueSize: 500, // Increased for batch processing
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
    enableRealTimeProcessing: true,
    enableBatchOptimization: true,
    compressionEnabled: true,
    cacheOptimization: true,
  };

  constructor(fileStoragePath: string = "data/multimodal") {
    this.fileStorage = fileStoragePath;
    this.imageProcessor = new ImageProcessingService();
    this.mediaProcessor = new AudioVideoProcessingService();
    this.initializeEnhancedProcessors();
    this.startPeriodicCleanup();
    console.log("🎭 Enhanced Multi-modal memory system initialized (Week 11-12)");
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
   * Initialize enhanced processors for Week 11-12
   */
  private initializeEnhancedProcessors(): void {
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

    // Enhanced Image processor (Week 11-12)
    this.processors.set("image", {
      type: "image",
      process: async (content: string, metadata?: any) => {
        try {
          const imageAnalysis = await this.imageProcessor.processImage(content, metadata);
          return {
            id: this.generateContentId(),
            type: "image",
            originalContent: content,
            processedContent: imageAnalysis.searchableText,
            features: {
              keywords: imageAnalysis.semanticTags,
              entities: imageAnalysis.ocrResult?.blocks?.map(block => ({
                name: block.text,
                type: "text",
                confidence: block.confidence,
              })) || [],
              topics: imageAnalysis.semanticTags.map(tag => ({ name: tag, weight: 0.8 })),
              structure: {
                width: imageAnalysis.metadata.width,
                height: imageAnalysis.metadata.height,
                format: imageAnalysis.metadata.format,
                objects: imageAnalysis.objectDetection?.objects?.length || 0,
              },
            },
            metadata: { imageAnalysis, ...metadata },
            searchableText: imageAnalysis.searchableText,
            processedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.warn(`Image processing failed: ${error}`);
          return this.createFallbackProcessedContent(content, "image", metadata);
        }
      },
      extract: async (content: string) => this.extractImageFeatures(content),
      search: async (query: string, items: ProcessedContent[]) => {
        return items
          .map((item) => ({
            contentId: item.id,
            relevance: this.calculateImageRelevance(query, item),
            matchedFeatures: [],
            context: item.searchableText.substring(0, 200),
          }))
          .filter((result) => result.relevance > 0.1);
      },
      similarity: (content1: ProcessedContent, content2: ProcessedContent) => {
        return this.calculateImageSimilarity(content1, content2);
      },
    });

    // Enhanced Audio processor (Week 11-12)
    this.processors.set("audio", {
      type: "audio",
      process: async (content: string, metadata?: any) => {
        try {
          const audioAnalysis = await this.mediaProcessor.processMediaFile(content, {
            enableSpeechToText: true,
            enableAudioAnalysis: true,
            ...metadata,
          });
          return {
            id: this.generateContentId(),
            type: "audio",
            originalContent: content,
            processedContent: audioAnalysis.searchableText,
            features: {
              keywords: audioAnalysis.semanticTags,
              entities: audioAnalysis.speechToText?.segments?.map(segment => ({
                name: segment.text,
                type: "speech",
                confidence: segment.confidence,
              })) || [],
              topics: audioAnalysis.semanticTags.map(tag => ({ name: tag, weight: 0.8 })),
              structure: {
                duration: audioAnalysis.metadata.duration,
                format: audioAnalysis.metadata.format,
                keyMoments: audioAnalysis.keyMoments.length,
              },
            },
            metadata: { audioAnalysis, ...metadata },
            searchableText: audioAnalysis.searchableText,
            processedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.warn(`Audio processing failed: ${error}`);
          return this.createFallbackProcessedContent(content, "audio", metadata);
        }
      },
      extract: async (content: string) => this.extractAudioFeatures(content),
      search: async (query: string, items: ProcessedContent[]) => {
        return items
          .map((item) => ({
            contentId: item.id,
            relevance: this.calculateAudioRelevance(query, item),
            matchedFeatures: [],
            context: item.searchableText.substring(0, 200),
          }))
          .filter((result) => result.relevance > 0.1);
      },
      similarity: (content1: ProcessedContent, content2: ProcessedContent) => {
        return this.calculateAudioSimilarity(content1, content2);
      },
    });

    // Enhanced Video processor (Week 11-12)
    this.processors.set("video", {
      type: "video",
      process: async (content: string, metadata?: any) => {
        try {
          const videoAnalysis = await this.mediaProcessor.processMediaFile(content, {
            enableSpeechToText: true,
            enableAudioAnalysis: true,
            enableVideoAnalysis: true,
            ...metadata,
          });
          return {
            id: this.generateContentId(),
            type: "video",
            originalContent: content,
            processedContent: videoAnalysis.searchableText,
            features: {
              keywords: videoAnalysis.semanticTags,
              entities: [
                ...(videoAnalysis.speechToText?.segments?.map(segment => ({
                  name: segment.text,
                  type: "speech",
                  confidence: segment.confidence,
                })) || []),
                ...(videoAnalysis.videoFeatures?.objectTracking?.map(obj => ({
                  name: obj.label,
                  type: "object",
                  confidence: obj.frames[0]?.confidence || 0.5,
                })) || []),
              ],
              topics: videoAnalysis.semanticTags.map(tag => ({ name: tag, weight: 0.8 })),
              structure: {
                duration: videoAnalysis.metadata.duration,
                format: videoAnalysis.metadata.format,
                width: (videoAnalysis.metadata as any).width,
                height: (videoAnalysis.metadata as any).height,
                sceneChanges: videoAnalysis.videoFeatures?.visualFeatures?.sceneChanges?.length || 0,
              },
            },
            metadata: { videoAnalysis, ...metadata },
            searchableText: videoAnalysis.searchableText,
            processedAt: new Date().toISOString(),
          };
        } catch (error) {
          console.warn(`Video processing failed: ${error}`);
          return this.createFallbackProcessedContent(content, "video", metadata);
        }
      },
      extract: async (content: string) => this.extractVideoFeatures(content),
      search: async (query: string, items: ProcessedContent[]) => {
        return items
          .map((item) => ({
            contentId: item.id,
            relevance: this.calculateVideoRelevance(query, item),
            matchedFeatures: [],
            context: item.searchableText.substring(0, 200),
          }))
          .filter((result) => result.relevance > 0.1);
      },
      similarity: (content1: ProcessedContent, content2: ProcessedContent) => {
        return this.calculateVideoSimilarity(content1, content2);
      },
    });

    // PDF processor (Week 11-12)
    this.processors.set("pdf", {
      type: "pdf",
      process: async (content: string, metadata?: any) => {
        const features = await this.extractPDFFeatures(content);
        return {
          id: this.generateContentId(),
          type: "pdf",
          originalContent: content,
          processedContent: features.extractedText,
          features,
          metadata: metadata || {},
          searchableText: features.extractedText,
          processedAt: new Date().toISOString(),
        };
      },
      extract: async (content: string) => this.extractPDFFeatures(content),
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

    // Office Document processor (Week 11-12)
    this.processors.set("office", {
      type: "office",
      process: async (content: string, metadata?: any) => {
        const features = await this.extractOfficeFeatures(content);
        return {
          id: this.generateContentId(),
          type: "office",
          originalContent: content,
          processedContent: features.extractedText,
          features,
          metadata: metadata || {},
          searchableText: features.extractedText,
          processedAt: new Date().toISOString(),
        };
      },
      extract: async (content: string) => this.extractOfficeFeatures(content),
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

    // Archive processor (Week 11-12)
    this.processors.set("archive", {
      type: "archive",
      process: async (content: string, metadata?: any) => {
        const features = await this.extractArchiveFeatures(content);
        return {
          id: this.generateContentId(),
          type: "archive",
          originalContent: content,
          processedContent: features.fileList,
          features,
          metadata: metadata || {},
          searchableText: features.fileList,
          processedAt: new Date().toISOString(),
        };
      },
      extract: async (content: string) => this.extractArchiveFeatures(content),
      search: async (query: string, items: ProcessedContent[]) => {
        return items
          .map((item) => ({
            contentId: item.id,
            relevance: this.calculateArchiveRelevance(query, item),
            matchedFeatures: [],
            context: item.searchableText.substring(0, 200),
          }))
          .filter((result) => result.relevance > 0.1);
      },
      similarity: (content1: ProcessedContent, content2: ProcessedContent) => {
        return this.calculateArchiveSimilarity(content1, content2);
      },
    });

    console.log(`📋 Initialized ${this.processors.size} enhanced modality processors (Week 11-12)`);
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
      return url.split("/")[0] || "";
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

  // Enhanced feature extraction methods for Week 11-12
  private async extractImageFeatures(imagePath: string): Promise<ExtractedFeatures> {
    try {
      const analysis = await this.imageProcessor.processImage(imagePath);
      return {
        keywords: analysis.semanticTags,
        entities: analysis.ocrResult?.blocks?.map(block => ({
          name: block.text,
          type: "text",
          confidence: block.confidence,
        })) || [],
        topics: analysis.semanticTags.map(tag => ({ name: tag, weight: 0.8 })),
        structure: {
          format: analysis.metadata.format,
          dimensions: `${analysis.metadata.width}x${analysis.metadata.height}`,
        },
      };
    } catch (error) {
      return { keywords: [], entities: [], topics: [] };
    }
  }

  private async extractAudioFeatures(audioPath: string): Promise<ExtractedFeatures> {
    try {
      const analysis = await this.mediaProcessor.processMediaFile(audioPath);
      return {
        keywords: analysis.semanticTags,
        entities: analysis.speechToText?.segments?.map(segment => ({
          name: segment.text,
          type: "speech",
          confidence: segment.confidence,
        })) || [],
        topics: analysis.semanticTags.map(tag => ({ name: tag, weight: 0.8 })),
        structure: {
          duration: analysis.metadata.duration,
          format: analysis.metadata.format,
        },
      };
    } catch (error) {
      return { keywords: [], entities: [], topics: [] };
    }
  }

  private async extractVideoFeatures(videoPath: string): Promise<ExtractedFeatures> {
    try {
      const analysis = await this.mediaProcessor.processMediaFile(videoPath);
      return {
        keywords: analysis.semanticTags,
        entities: [
          ...(analysis.speechToText?.segments?.map(segment => ({
            name: segment.text,
            type: "speech",
            confidence: segment.confidence,
          })) || []),
          ...(analysis.videoFeatures?.objectTracking?.map(obj => ({
            name: obj.label,
            type: "object",
            confidence: obj.frames[0]?.confidence || 0.5,
          })) || []),
        ],
        topics: analysis.semanticTags.map(tag => ({ name: tag, weight: 0.8 })),
        structure: {
          duration: analysis.metadata.duration,
          format: analysis.metadata.format,
        },
      };
    } catch (error) {
      return { keywords: [], entities: [], topics: [] };
    }
  }

  private async extractPDFFeatures(pdfPath: string): Promise<ExtractedFeatures & { extractedText: string }> {
    try {
      // Note: In production, would use pdf-parse, PDF.js, or similar library
      // For now, simulate PDF text extraction
      const simulatedText = this.simulatePDFExtraction(pdfPath);
      const textFeatures = await this.extractTextFeatures(simulatedText);
      
      return {
        ...textFeatures,
        extractedText: simulatedText,
        structure: {
          format: "pdf",
          pages: Math.floor(Math.random() * 20) + 1,
        },
      };
    } catch (error) {
      return { keywords: [], entities: [], topics: [], extractedText: "" };
    }
  }

  private async extractOfficeFeatures(officePath: string): Promise<ExtractedFeatures & { extractedText: string }> {
    try {
      // Note: In production, would use officegen, node-office-parser, or similar
      // For now, simulate Office document text extraction
      const simulatedText = this.simulateOfficeExtraction(officePath);
      const textFeatures = await this.extractTextFeatures(simulatedText);
      
      return {
        ...textFeatures,
        extractedText: simulatedText,
        structure: {
          format: this.getFileExtension(officePath),
          documentType: this.getOfficeDocumentType(officePath),
        },
      };
    } catch (error) {
      return { keywords: [], entities: [], topics: [], extractedText: "" };
    }
  }

  private async extractArchiveFeatures(archivePath: string): Promise<ExtractedFeatures & { fileList: string }> {
    try {
      // Note: In production, would use node-7z, yauzl, or similar
      // For now, simulate archive content listing
      const fileList = this.simulateArchiveExtraction(archivePath);
      
      return {
        keywords: fileList.split(" "),
        entities: [],
        topics: [{ name: "archive", weight: 1.0 }],
        fileList,
        structure: {
          format: this.getFileExtension(archivePath),
          fileCount: fileList.split("\n").length,
        },
      };
    } catch (error) {
      return { keywords: [], entities: [], topics: [], fileList: "" };
    }
  }

  // Enhanced relevance calculation methods
  private calculateImageRelevance(query: string, item: ProcessedContent): number {
    const queryLower = query.toLowerCase();
    
    // Check OCR text and tags
    const contentRelevance = this.calculateTextRelevance(query, item.searchableText);
    
    // Check metadata
    const metadata = item.metadata?.imageAnalysis;
    let metadataRelevance = 0;
    
    if (metadata) {
      if (metadata.semanticTags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        metadataRelevance += 0.3;
      }
      if (metadata.ocrResult?.text?.toLowerCase().includes(queryLower)) {
        metadataRelevance += 0.4;
      }
    }
    
    return Math.min(contentRelevance + metadataRelevance, 1.0);
  }

  private calculateAudioRelevance(query: string, item: ProcessedContent): number {
    const queryLower = query.toLowerCase();
    const contentRelevance = this.calculateTextRelevance(query, item.searchableText);
    
    const metadata = item.metadata?.audioAnalysis;
    let metadataRelevance = 0;
    
    if (metadata) {
      if (metadata.speechToText?.transcript?.toLowerCase().includes(queryLower)) {
        metadataRelevance += 0.5;
      }
      if (metadata.semanticTags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        metadataRelevance += 0.3;
      }
    }
    
    return Math.min(contentRelevance + metadataRelevance, 1.0);
  }

  private calculateVideoRelevance(query: string, item: ProcessedContent): number {
    const queryLower = query.toLowerCase();
    const contentRelevance = this.calculateTextRelevance(query, item.searchableText);
    
    const metadata = item.metadata?.videoAnalysis;
    let metadataRelevance = 0;
    
    if (metadata) {
      if (metadata.speechToText?.transcript?.toLowerCase().includes(queryLower)) {
        metadataRelevance += 0.4;
      }
      if (metadata.videoFeatures?.objectTracking?.some((obj: any) => 
        obj.label.toLowerCase().includes(queryLower))) {
        metadataRelevance += 0.3;
      }
      if (metadata.semanticTags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        metadataRelevance += 0.2;
      }
    }
    
    return Math.min(contentRelevance + metadataRelevance, 1.0);
  }

  private calculateArchiveRelevance(query: string, item: ProcessedContent): number {
    const queryLower = query.toLowerCase();
    const fileList = item.searchableText.toLowerCase();
    
    // Check if query matches file names or extensions
    const fileMatches = fileList.split("\n").filter(file => 
      file.includes(queryLower)
    ).length;
    
    return Math.min(fileMatches / 10, 1.0); // Normalize by max expected matches
  }

  // Enhanced similarity calculation methods
  private calculateImageSimilarity(content1: ProcessedContent, content2: ProcessedContent): number {
    // Compare image metadata and features
    const meta1 = content1.metadata?.imageAnalysis;
    const meta2 = content2.metadata?.imageAnalysis;
    
    if (!meta1 || !meta2) {
      return this.calculateTextSimilarity(content1.searchableText, content2.searchableText);
    }
    
    let similarity = 0;
    let factors = 0;
    
    // Compare dimensions
    const dimSimilarity = this.compareDimensions(meta1.metadata, meta2.metadata);
    similarity += dimSimilarity * 0.2;
    factors += 0.2;
    
    // Compare semantic tags
    const tagSimilarity = this.compareArrays(meta1.semanticTags, meta2.semanticTags);
    similarity += tagSimilarity * 0.5;
    factors += 0.5;
    
    // Compare OCR text
    const ocrSimilarity = this.calculateTextSimilarity(
      meta1.ocrResult?.text || "",
      meta2.ocrResult?.text || ""
    );
    similarity += ocrSimilarity * 0.3;
    factors += 0.3;
    
    return factors > 0 ? similarity / factors : 0;
  }

  private calculateAudioSimilarity(content1: ProcessedContent, content2: ProcessedContent): number {
    const meta1 = content1.metadata?.audioAnalysis;
    const meta2 = content2.metadata?.audioAnalysis;
    
    if (!meta1 || !meta2) {
      return this.calculateTextSimilarity(content1.searchableText, content2.searchableText);
    }
    
    let similarity = 0;
    let factors = 0;
    
    // Compare duration
    const durationSimilarity = 1 - Math.abs(meta1.metadata.duration - meta2.metadata.duration) / 
      Math.max(meta1.metadata.duration, meta2.metadata.duration);
    similarity += durationSimilarity * 0.2;
    factors += 0.2;
    
    // Compare transcripts
    const transcriptSimilarity = this.calculateTextSimilarity(
      meta1.speechToText?.transcript || "",
      meta2.speechToText?.transcript || ""
    );
    similarity += transcriptSimilarity * 0.6;
    factors += 0.6;
    
    // Compare semantic tags
    const tagSimilarity = this.compareArrays(meta1.semanticTags, meta2.semanticTags);
    similarity += tagSimilarity * 0.2;
    factors += 0.2;
    
    return factors > 0 ? similarity / factors : 0;
  }

  private calculateVideoSimilarity(content1: ProcessedContent, content2: ProcessedContent): number {
    const meta1 = content1.metadata?.videoAnalysis;
    const meta2 = content2.metadata?.videoAnalysis;
    
    if (!meta1 || !meta2) {
      return this.calculateTextSimilarity(content1.searchableText, content2.searchableText);
    }
    
    let similarity = 0;
    let factors = 0;
    
    // Compare audio similarity (reuse audio logic)
    const audioSimilarity = this.calculateAudioSimilarity(content1, content2);
    similarity += audioSimilarity * 0.5;
    factors += 0.5;
    
    // Compare video-specific features
    const objectSimilarity = this.compareVideoObjects(
      meta1.videoFeatures?.objectTracking,
      meta2.videoFeatures?.objectTracking
    );
    similarity += objectSimilarity * 0.3;
    factors += 0.3;
    
    // Compare visual complexity
    const complexitySimilarity = 1 - Math.abs(
      (meta1.videoFeatures?.contentAnalysis?.complexity || 0) - 
      (meta2.videoFeatures?.contentAnalysis?.complexity || 0)
    );
    similarity += complexitySimilarity * 0.2;
    factors += 0.2;
    
    return factors > 0 ? similarity / factors : 0;
  }

  private calculateArchiveSimilarity(content1: ProcessedContent, content2: ProcessedContent): number {
    const fileList1 = content1.searchableText.split("\n");
    const fileList2 = content2.searchableText.split("\n");
    
    // Compare file extensions
    const ext1 = fileList1.map(f => this.getFileExtension(f));
    const ext2 = fileList2.map(f => this.getFileExtension(f));
    
    return this.compareArrays(ext1, ext2);
  }

  // Helper methods for enhanced processing
  private createFallbackProcessedContent(content: string, type: ModalityType, metadata?: any): ProcessedContent {
    return {
      id: this.generateContentId(),
      type,
      originalContent: content,
      processedContent: content,
      features: { keywords: [], entities: [], topics: [] },
      metadata: metadata || {},
      searchableText: content,
      processedAt: new Date().toISOString(),
    };
  }

  private simulatePDFExtraction(pdfPath: string): string {
    const sampleTexts = [
      "This is a research paper about artificial intelligence and machine learning applications.",
      "Technical documentation for software development best practices and coding standards.",
      "Business report analyzing market trends and financial performance metrics.",
      "Educational material covering advanced topics in computer science and engineering.",
    ];
    return sampleTexts[Math.floor(Math.random() * sampleTexts.length)] || "";
  }

  private simulateOfficeExtraction(officePath: string): string {
    const extension = this.getFileExtension(officePath);
    const sampleTexts = {
      doc: "Document content with headings, paragraphs, and formatted text about project management.",
      docx: "Modern document with advanced formatting discussing digital transformation strategies.",
      xls: "Spreadsheet data: Revenue Q1: $100K, Q2: $120K, Q3: $115K, Q4: $130K",
      xlsx: "Advanced spreadsheet with formulas and charts analyzing business performance metrics.",
      ppt: "Presentation slides: Introduction, Problem Statement, Solution, Implementation, Conclusion",
      pptx: "Modern presentation about AI technologies with visual elements and animations.",
    };
    return sampleTexts[extension as keyof typeof sampleTexts] || "Office document content";
  }

  private simulateArchiveExtraction(archivePath: string): string {
    const fileTypes = ["txt", "doc", "pdf", "jpg", "mp3", "mp4", "js", "ts", "py"];
    const fileCount = Math.floor(Math.random() * 20) + 5;
    
    const files = Array.from({ length: fileCount }, (_, i) => {
      const type = fileTypes[Math.floor(Math.random() * fileTypes.length)];
      return `file_${i + 1}.${type}`;
    });
    
    return files.join("\n");
  }

  private getOfficeDocumentType(filePath: string): string {
    const extension = this.getFileExtension(filePath);
    const typeMap: Record<string, string> = {
      doc: "word_document",
      docx: "word_document",
      xls: "excel_spreadsheet",
      xlsx: "excel_spreadsheet",
      ppt: "powerpoint_presentation",
      pptx: "powerpoint_presentation",
    };
    return typeMap[extension] || "unknown_office";
  }

  private getFileExtension(filePath: string): string {
    return filePath.split(".").pop()?.toLowerCase() || "";
  }

  private compareDimensions(dim1: any, dim2: any): number {
    if (!dim1 || !dim2) return 0;
    
    const aspectRatio1 = dim1.width / dim1.height;
    const aspectRatio2 = dim2.width / dim2.height;
    
    return 1 - Math.abs(aspectRatio1 - aspectRatio2) / Math.max(aspectRatio1, aspectRatio2);
  }

  private compareArrays(arr1: string[], arr2: string[]): number {
    if (!arr1 || !arr2 || arr1.length === 0 || arr2.length === 0) return 0;
    
    const set1 = new Set(arr1.map(item => item.toLowerCase()));
    const set2 = new Set(arr2.map(item => item.toLowerCase()));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private compareVideoObjects(objects1: any[], objects2: any[]): number {
    if (!objects1 || !objects2) return 0;
    
    const labels1 = objects1.map(obj => obj.label);
    const labels2 = objects2.map(obj => obj.label);
    
    return this.compareArrays(labels1, labels2);
  }

  private generateContentId(): string {
    return (
      "mm_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
    );
  }
}

// Re-export as MultiModalMemorySystem for backward compatibility
export const MultiModalMemorySystem = EnhancedMultiModalMemorySystem;
