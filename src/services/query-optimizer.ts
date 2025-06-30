/**
 * Query Optimizer Service for BeruMemorix
 * Improves search queries through various optimization techniques
 */

export interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  techniques: string[];
  confidence: number; // 0-1, how confident we are this will improve results
  estimatedImprovement: number; // 0-1, expected improvement in results
}

export interface QueryAnalysis {
  type: "short" | "medium" | "long" | "very_long";
  hasSpecialChars: boolean;
  hasTypos: boolean;
  isCompound: boolean;
  hasAbbreviations: boolean;
  language: "english" | "vietnamese" | "mixed" | "unknown";
  complexity: "simple" | "medium" | "complex";
}

export class QueryOptimizerService {
  // Common abbreviations and their expansions
  private readonly abbreviations: { [key: string]: string[] } = {
    // Tech abbreviations
    ai: ["artificial intelligence", "artificial", "intelligence"],
    ml: ["machine learning", "machine", "learning"],
    api: ["application programming interface", "programming interface"],
    ui: ["user interface", "interface"],
    ux: ["user experience", "experience"],
    db: ["database", "data"],
    js: ["javascript", "script"],
    ts: ["typescript", "type"],
    css: ["cascading style sheets", "style"],
    html: ["hypertext markup language", "markup"],
    sql: ["structured query language", "query language"],

    // Vietnamese tech terms
    cntt: ["công nghệ thông tin", "thông tin"],
    ktpm: ["kỹ thuật phần mềm", "phần mềm"],

    // General abbreviations
    etc: ["et cetera", "and so on"],
    vs: ["versus", "against"],
    app: ["application", "software"],
    sys: ["system", "platform"],
  };

  // Common typos and corrections
  private readonly typoCorrections: { [key: string]: string } = {
    // Common programming typos
    fucntion: "function",
    calss: "class",
    methdo: "method",
    varialbe: "variable",
    stirng: "string",
    lenght: "length",
    widht: "width",
    heigth: "height",

    // Vietnamese typos
    cong: "công",
    nghe: "nghệ",
    thuat: "thuật",
    phan: "phần",
    mem: "mềm",

    // English typos
    recieve: "receive",
    seperate: "separate",
    occurence: "occurrence",
    definately: "definitely",
    algoritm: "algorithm",
    begining: "beginning",
  };

  // Synonyms for query expansion
  private readonly synonyms: { [key: string]: string[] } = {
    // Programming concepts
    function: ["method", "procedure", "routine", "subroutine"],
    variable: ["var", "parameter", "field", "property"],
    array: ["list", "collection", "sequence"],
    object: ["instance", "entity", "item"],
    class: ["type", "template", "blueprint"],

    // Search terms
    find: ["search", "locate", "discover", "retrieve"],
    create: ["make", "build", "generate", "produce"],
    update: ["modify", "change", "edit", "revise"],
    delete: ["remove", "erase", "destroy", "eliminate"],

    // Vietnamese synonyms
    tìm: ["tìm kiếm", "khám phá", "phát hiện"],
    tạo: ["chế tạo", "xây dựng", "phát triển"],
    sửa: ["chỉnh sửa", "cập nhật", "thay đổi"],
    xóa: ["loại bỏ", "gỡ bỏ", "hủy"],
  };

  /**
   * Analyze query characteristics
   */
  analyzeQuery(query: string): QueryAnalysis {
    const length = query.length;
    const words = query.split(/\s+/).filter((w) => w.length > 0);

    // Determine type by length
    let type: QueryAnalysis["type"];
    if (length <= 10) type = "short";
    else if (length <= 30) type = "medium";
    else if (length <= 100) type = "long";
    else type = "very_long";

    // Check for special characters
    const hasSpecialChars = /[^a-zA-ZÀ-ỹ0-9\s]/.test(query);

    // Check for potential typos
    const hasTypos = words.some(
      (word) => this.typoCorrections[word.toLowerCase()] !== undefined
    );

    // Check if compound (camelCase or PascalCase)
    const isCompound =
      /[a-z][A-Z]/.test(query) ||
      Boolean(words.length === 1 && words[0] && words[0].length > 8);

    // Check for abbreviations
    const hasAbbreviations = words.some(
      (word) => this.abbreviations[word.toLowerCase()] !== undefined
    );

    // Basic language detection
    const vietnameseChars =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    const hasVietnamese = vietnameseChars.test(query);
    const hasEnglish = /[a-zA-Z]/.test(query);

    let language: QueryAnalysis["language"];
    if (hasVietnamese && hasEnglish) language = "mixed";
    else if (hasVietnamese) language = "vietnamese";
    else if (hasEnglish) language = "english";
    else language = "unknown";

    // Determine complexity
    let complexity: QueryAnalysis["complexity"];
    if (words.length <= 2 && !hasSpecialChars) complexity = "simple";
    else if (words.length <= 5 || hasSpecialChars) complexity = "medium";
    else complexity = "complex";

    return {
      type,
      hasSpecialChars,
      hasTypos,
      isCompound,
      hasAbbreviations,
      language,
      complexity,
    };
  }

  /**
   * Optimize a search query
   */
  optimizeQuery(query: string): QueryOptimization {
    const analysis = this.analyzeQuery(query);
    const techniques: string[] = [];
    let optimizedQuery = query.trim();
    let confidence = 0.5;
    let estimatedImprovement = 0.1;

    // 1. Normalize whitespace
    if (/\s{2,}/.test(optimizedQuery)) {
      optimizedQuery = optimizedQuery.replace(/\s+/g, " ");
      techniques.push("whitespace_normalization");
      confidence += 0.1;
      estimatedImprovement += 0.05;
    }

    // 2. Fix typos
    if (analysis.hasTypos) {
      const words = optimizedQuery.split(/\s+/);
      const correctedWords = words.map((word) => {
        const correction = this.typoCorrections[word.toLowerCase()];
        return correction || word;
      });

      if (correctedWords.join(" ") !== optimizedQuery) {
        optimizedQuery = correctedWords.join(" ");
        techniques.push("typo_correction");
        confidence += 0.3;
        estimatedImprovement += 0.4;
      }
    }

    // 3. Expand abbreviations
    if (analysis.hasAbbreviations) {
      const expandedQuery = this.expandAbbreviations(optimizedQuery);
      if (expandedQuery !== optimizedQuery) {
        optimizedQuery = expandedQuery;
        techniques.push("abbreviation_expansion");
        confidence += 0.2;
        estimatedImprovement += 0.3;
      }
    }

    // 4. Split compound words
    if (analysis.isCompound) {
      const splitQuery = this.splitCompoundWords(optimizedQuery);
      if (splitQuery !== optimizedQuery) {
        optimizedQuery = splitQuery;
        techniques.push("compound_word_splitting");
        confidence += 0.2;
        estimatedImprovement += 0.2;
      }
    }

    // 5. Remove excessive special characters
    if (analysis.hasSpecialChars) {
      const cleanQuery = optimizedQuery
        .replace(/[^\w\sÀ-ỹ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleanQuery !== optimizedQuery && cleanQuery.length > 0) {
        optimizedQuery = cleanQuery;
        techniques.push("special_char_removal");
        confidence += 0.15;
        estimatedImprovement += 0.15;
      }
    }

    // 6. Add synonyms for very short queries
    if (analysis.type === "short" && optimizedQuery.split(/\s+/).length <= 2) {
      const expandedQuery = this.addSynonyms(optimizedQuery);
      if (expandedQuery !== optimizedQuery) {
        optimizedQuery = expandedQuery;
        techniques.push("synonym_expansion");
        confidence += 0.1;
        estimatedImprovement += 0.2;
      }
    }

    // 7. Capitalize proper nouns (for better matching)
    const capitalizedQuery = this.capitalizeProperNouns(optimizedQuery);
    if (capitalizedQuery !== optimizedQuery) {
      optimizedQuery = capitalizedQuery;
      techniques.push("proper_noun_capitalization");
      confidence += 0.05;
      estimatedImprovement += 0.05;
    }

    // Ensure confidence and improvement are within bounds
    confidence = Math.min(confidence, 0.95);
    estimatedImprovement = Math.min(estimatedImprovement, 0.8);

    return {
      originalQuery: query,
      optimizedQuery: optimizedQuery.trim(),
      techniques,
      confidence,
      estimatedImprovement,
    };
  }

  /**
   * Expand abbreviations in query
   */
  private expandAbbreviations(query: string): string {
    let expanded = query;
    const words = query.toLowerCase().split(/\s+/);

    words.forEach((word) => {
      const expansions = this.abbreviations[word];
      if (expansions && expansions.length > 0) {
        // Use the most comprehensive expansion
        const bestExpansion = expansions.reduce((longest, current) =>
          current.length > longest.length ? current : longest
        );

        // Replace the abbreviation with expansion
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        expanded = expanded.replace(regex, bestExpansion);
      }
    });

    return expanded;
  }

  /**
   * Split compound words (camelCase, PascalCase)
   */
  private splitCompoundWords(query: string): string {
    return (
      query
        // Split camelCase and PascalCase
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        // Split words joined by numbers
        .replace(/([a-zA-Z])(\d)/g, "$1 $2")
        .replace(/(\d)([a-zA-Z])/g, "$1 $2")
        // Clean up extra spaces
        .replace(/\s+/g, " ")
        .trim()
    );
  }

  /**
   * Add synonyms to expand query scope
   */
  private addSynonyms(query: string): string {
    const words = query.toLowerCase().split(/\s+/);
    const expandedWords: string[] = [];

    words.forEach((word) => {
      expandedWords.push(word);

      const synonymList = this.synonyms[word];
      if (synonymList && synonymList.length > 0) {
        // Add 1-2 most relevant synonyms
        expandedWords.push(...synonymList.slice(0, 2));
      }
    });

    // Remove duplicates and return
    return [...new Set(expandedWords)].join(" ");
  }

  /**
   * Capitalize proper nouns and known terms
   */
  private capitalizeProperNouns(query: string): string {
    const properNouns = [
      "javascript",
      "typescript",
      "python",
      "java",
      "css",
      "html",
      "react",
      "vue",
      "angular",
      "node",
      "express",
      "mongodb",
      "postgresql",
      "mysql",
      "redis",
      "docker",
      "kubernetes",
      "beruMemorix",
      "github",
      "vscode",
      "cursor",
    ];

    let result = query;

    properNouns.forEach((noun) => {
      const regex = new RegExp(`\\b${noun}\\b`, "gi");
      result = result.replace(regex, (match) => {
        // Capitalize first letter
        return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
      });
    });

    return result;
  }

  /**
   * Generate multiple query variations
   */
  generateQueryVariations(query: string, maxVariations = 5): string[] {
    const variations = new Set<string>();
    variations.add(query); // Original query

    const optimization = this.optimizeQuery(query);
    variations.add(optimization.optimizedQuery);

    // Add partial optimizations
    const analysis = this.analyzeQuery(query);

    if (analysis.hasTypos) {
      variations.add(this.fixTypos(query));
    }

    if (analysis.hasAbbreviations) {
      variations.add(this.expandAbbreviations(query));
    }

    if (analysis.isCompound) {
      variations.add(this.splitCompoundWords(query));
    }

    // Add case variations
    variations.add(query.toLowerCase());
    variations.add(query.toUpperCase());

    // Add partial queries for long queries
    if (analysis.type === "long" || analysis.type === "very_long") {
      const words = query.split(/\s+/);
      if (words.length > 3) {
        // Take first half and second half
        const mid = Math.floor(words.length / 2);
        variations.add(words.slice(0, mid).join(" "));
        variations.add(words.slice(mid).join(" "));

        // Take key words (longer than 3 characters)
        const keyWords = words.filter((w) => w.length > 3);
        if (keyWords.length > 0) {
          variations.add(keyWords.join(" "));
        }
      }
    }

    return Array.from(variations)
      .filter((v) => v.trim().length > 0)
      .slice(0, maxVariations);
  }

  /**
   * Simple typo correction
   */
  private fixTypos(query: string): string {
    const words = query.split(/\s+/);
    const correctedWords = words.map((word) => {
      const correction = this.typoCorrections[word.toLowerCase()];
      return correction || word;
    });

    return correctedWords.join(" ");
  }

  /**
   * Score query quality (0-1, higher is better)
   */
  scoreQueryQuality(query: string): number {
    const analysis = this.analyzeQuery(query);
    let score = 0.5; // Base score

    // Length scoring
    if (analysis.type === "medium") score += 0.2;
    else if (analysis.type === "short") score += 0.1;
    else if (analysis.type === "long") score -= 0.1;
    else if (analysis.type === "very_long") score -= 0.2;

    // Complexity scoring
    if (analysis.complexity === "simple") score += 0.1;
    else if (analysis.complexity === "complex") score -= 0.2;

    // Penalty for issues
    if (analysis.hasTypos) score -= 0.3;
    if (analysis.hasSpecialChars) score -= 0.1;

    // Bonus for clear structure
    if (
      !analysis.hasTypos &&
      !analysis.hasSpecialChars &&
      analysis.complexity === "medium"
    ) {
      score += 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }
}
