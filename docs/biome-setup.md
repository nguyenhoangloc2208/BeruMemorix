# 🧬 Biome Setup Guide for BeruMemorix

## Overview

BeruMemorix uses **Biome** as the primary toolchain for linting, formatting, and code organization. This setup ensures world-class code quality while maintaining the strict <200 lines per module rule.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Check code quality (lint + format + organize imports)
npm run check

# Auto-fix issues
npm run check:fix

# Format only
npm run format:write

# Lint only  
npm run lint:fix

# Type check
npm run type-check
```

## 🔧 Configuration Files

### 1. `biome.json` - Main Configuration

Key features:
- **Strict TypeScript rules** for enterprise-grade code
- **100-character line width** for readability
- **No default exports** to enforce explicit imports
- **Comprehensive naming conventions**
- **Security and performance rules**

### 2. `.biomeignore` - Ignore Patterns

Excludes:
- Build outputs (`dist/`, `build/`)
- Dependencies (`node_modules/`)
- Generated files (`*.d.ts`)
- Environment files (`.env*`)
- Cache directories

### 3. Path Mapping Support

Biome works seamlessly with TypeScript path mapping:

```typescript
import { Memory } from '@/types/memory';
import { validateMemory } from '@/utils/validation';
import { MemoryService } from '@/services/memory-service';
```

## 📋 Code Quality Rules

### 🎯 Core Principles

1. **Modular Design**: Each file <200 lines
2. **Explicit Imports**: No default exports
3. **Type Safety**: Strict TypeScript configuration
4. **Consistent Naming**: PascalCase classes, camelCase functions
5. **Security First**: No dangerous operations allowed

### 🔍 Key Rules Enforced

#### Style Rules
- `noDefaultExport`: Enforces named exports
- `useNamingConvention`: Consistent naming patterns
- `useFilenamingConvention`: kebab-case or camelCase files
- `noNonNullAssertion`: Avoid unsafe type assertions

#### Security Rules
- `noDangerouslySetInnerHtml`: Prevent XSS
- `noGlobalEval`: No eval() usage
- Rate limiting and input validation enforced

#### Performance Rules
- `noAccumulatingSpread`: Prevent performance bottlenecks
- `useOptionalChain`: Modern JavaScript features
- `noDelete`: Avoid expensive delete operations

## 🛠️ Development Workflow

### Pre-commit Checks

```bash
# Runs automatically before commit
npm run precommit
```

This executes:
1. `biome check --apply` (fix issues)
2. `tsc --noEmit` (type checking)
3. `vitest` (run tests)

### IDE Integration

#### VS Code
Install the official Biome extension:

```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

#### Other IDEs
- **WebStorm**: Use Biome plugin
- **Neovim**: LSP integration available
- **Cursor**: Built-in support

## 🎨 Formatting Standards

### Code Style
```typescript
// ✅ Good
export const createMemory = async (data: MemoryData): Promise<Memory> => {
  const validated = validateMemoryData(data);
  return await memoryService.create(validated);
};

// ❌ Bad (default export, no types)
export default async function(data) {
  return memoryService.create(data);
}
```

### Import Organization
```typescript
// ✅ Good - Auto-organized by Biome
import type { Memory, MemoryType } from '@/types/memory';
import { nanoid } from 'nanoid';
import { validateMemory } from '@/utils/validation';
import { MemoryService } from '@/services/memory-service';

// ❌ Bad - Mixed imports
import { MemoryService } from '@/services/memory-service';
import type { Memory } from '@/types/memory';
import { nanoid } from 'nanoid';
```

## 🔧 Custom Overrides

### Test Files
- `noConsoleLog`: Disabled in tests
- `noExplicitAny`: Relaxed for test fixtures
- `noNonNullAssertion`: Allowed in tests

### Config Files
- `noDefaultExport`: Disabled for config files
- More lenient rules for setup scripts

### Type Definitions
- `noEmptyInterface`: Disabled for extending types
- `noDefaultExport`: Disabled for ambient declarations

## 📊 Metrics & Monitoring

### Code Quality Metrics
```bash
# Generate code quality report
npm run check 2>&1 | tee quality-report.txt

# Test coverage with quality gates
npm run test:coverage
```

### Automation
- **Pre-commit hooks**: Automatic formatting
- **CI/CD integration**: Quality gates
- **Dependency updates**: Automated with quality checks

## 🚀 Performance Optimizations

### Biome Performance Tips
1. **Incremental checking**: Only changed files
2. **Parallel processing**: Multi-threaded execution
3. **Caching**: `.biome-cache/` for faster subsequent runs
4. **Selective runs**: Target specific directories

```bash
# Fast checks for specific areas
npm run check src/services/
npm run format src/mcp/
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Path Resolution
```bash
# If path mapping isn't working
npm run clean && npm run build
```

#### 2. Cache Issues
```bash
# Clear Biome cache
rm -rf .biome-cache/
npm run check:fix
```

#### 3. Type Errors
```bash
# Separate type checking
npm run type-check
```

### Debug Mode
```bash
# Verbose Biome output
npx biome check --verbose src/
```

## 📈 Migration from ESLint/Prettier

Biome replaces both ESLint and Prettier with:
- **10x faster** performance
- **Zero configuration** for TypeScript
- **Built-in formatting** (no conflicts)
- **Better error messages**

### Migration Steps
1. Remove ESLint/Prettier configs
2. Install Biome dependencies
3. Apply configurations
4. Update IDE settings
5. Update CI/CD scripts

## 🎯 Best Practices

### 1. Modular Architecture
```typescript
// ✅ Each service <200 lines
export class MemoryService {
  // Core memory operations only
}

export class MemoryAnalytics {
  // Analytics-specific logic
}
```

### 2. Type-First Development
```typescript
// ✅ Define types first
export interface CreateMemoryRequest {
  content: string;
  type: MemoryType;
  metadata?: MemoryMetadata;
}

export const createMemory = (request: CreateMemoryRequest): Promise<Memory> => {
  // Implementation follows types
};
```

### 3. Error Handling
```typescript
// ✅ Explicit error types
export class MemoryValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(`Invalid ${field}: ${String(value)}`);
  }
}
```

---

## 📚 Additional Resources

- [Biome Official Documentation](https://biomejs.dev/)
- [TypeScript Configuration Reference](https://www.typescriptlang.org/tsconfig)
- [Clean Code Principles](../clean-code-guidelines.md)
- [Project Architecture Guide](../architecture.md)

**Happy coding with world-class quality! 🚀** 