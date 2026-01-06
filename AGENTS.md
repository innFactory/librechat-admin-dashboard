# AI Agent Instructions for LibreChat Admin Dashboard

This document provides critical guidelines for AI agents (LLMs) working on this codebase.

## ⚠️ Critical: LibreChat Schema Compatibility

This dashboard connects directly to LibreChat's MongoDB database. **All metrics, queries, and data structures MUST remain compatible with the official LibreChat schema.**

### Before Making Changes

1. **Consult LibreChat Source Code**: Always reference the official LibreChat repository at `danny-avila/LibreChat` before modifying:
   - Database queries or aggregation pipelines
   - Type definitions for database entities
   - Token counting or billing logic
   - User, conversation, or message handling

2. **Key LibreChat Schema Files**:
   - `packages/data-schemas/src/schema/transaction.ts` - Transaction/billing schema
   - `packages/data-schemas/src/schema/message.ts` - Message schema
   - `packages/data-schemas/src/schema/convo.ts` - Conversation schema
   - `api/models/spendTokens.js` - Token spending logic

3. **Run Compatibility Tests**: After any change, run `npm test` to verify LibreChat schema compatibility tests pass.

## 📊 Token Counting Logic

LibreChat uses specific token counting conventions that this dashboard must follow:

### Transaction-Based Token Counting (Accurate Billing)
```typescript
// Transactions store rawAmount as NEGATIVE for spending
// Always use $abs when summing tokens
{ $sum: { $abs: "$rawAmount" } }

// Token types:
// - "prompt" = input tokens
// - "completion" = output tokens  
// - "credits" = credit-based billing
```

### Message-Based Token Counting (Per-Message)
```typescript
// messages.tokenCount = tokens for individual message only
// Does NOT include full conversation context
// Use transactions for accurate API consumption metrics
```

### Structured Token Fields (Cache-Aware)
```typescript
// Modern LibreChat transactions may include:
interface StructuredTokens {
  inputTokens?: number;      // Total input tokens
  writeTokens?: number;      // Cache write tokens
  readTokens?: number;       // Cache read tokens (discounted)
}
```

## 🔗 MCP Tool Call Detection

MCP (Model Context Protocol) tools are identified by delimiter patterns in tool names:

```typescript
// MCP tool name formats:
// - toolName_mcp_serverName (e.g., "search_mcp_brave")
// - toolName::serverName (e.g., "read_file::filesystem")

const MCP_DELIMITER = "(_mcp_|::)";

// Tool calls are stored in messages.content[] as:
{
  type: "tool_call",
  tool_call: {
    name: "toolName_mcp_serverName",
    // ...
  }
}
```

## 🏗️ Architecture Guidelines

### Repository Pattern
- All database queries go through `src/lib/db/repositories/`
- Use pipeline builders from `src/lib/db/pipeline-builders.ts` for consistency
- Types must match LibreChat schemas in `src/lib/db/types.ts`

### API Routes
- Located in `src/app/api/`
- Use Zod validation for query parameters
- Always validate date ranges and handle edge cases

### State Management
- Jotai atoms in `src/atoms/`
- Use `useLoadableWithCache` hook for data fetching

## 🧪 Testing Requirements

### Before Any PR/Commit

1. **Format Check**: `npm run format:check`
2. **Type Check**: `npm run type-check`
3. **Tests**: `npm test`

### Test Categories

| Test File | Purpose |
|-----------|---------|
| `librechat-schema-compatibility.test.ts` | Verify types match LibreChat schemas |
| `pipeline-builders.test.ts` | MongoDB aggregation pipeline correctness |
| `date-validation.test.ts` | Date handling and LibreChat compatibility |
| `*-repository.test.ts` | Repository function behavior |

### Writing New Tests

When adding features that interact with LibreChat data:

1. Add schema compatibility tests verifying field names and types
2. Test with realistic LibreChat data patterns
3. Consider edge cases: null models, agent endpoints, empty conversations

## 🚫 Common Mistakes to Avoid

### ❌ Don't Do This

```typescript
// Wrong: Using messages.tokenCount for billing metrics
{ $sum: "$tokenCount" }

// Wrong: Forgetting $abs on transaction amounts
{ $sum: "$rawAmount" }  // rawAmount is negative!

// Wrong: Hardcoding endpoint names
endpoint: "openai"  // Should be "openAI" (camelCase)

// Wrong: Ignoring null models
$match: { model: "gpt-4" }  // Missing null check
```

### ✅ Do This Instead

```typescript
// Correct: Use transactions with $abs for billing
{ $sum: { $abs: "$rawAmount" } }

// Correct: Filter null models
$match: { model: { $ne: null } }

// Correct: Use LibreChat endpoint values
// "openAI", "google", "anthropic", "agents", "assistants", "azureOpenAI", "bedrock"
```

## 📋 Pre-Release Checklist

Before releasing a new version:

- [ ] All tests pass (`npm test`)
- [ ] No format errors (`npm run format:check`)
- [ ] No type errors (`npm run type-check`)
- [ ] Docker build succeeds (`docker build .`)
- [ ] Tested against real LibreChat MongoDB instance
- [ ] Schema compatibility tests cover new features
- [ ] No breaking changes to existing API routes

## 🔄 When LibreChat Updates

If LibreChat releases schema changes:

1. Review LibreChat changelog and migration notes
2. Update `src/lib/db/types.ts` to match new schemas
3. Update affected repository queries
4. Add/update schema compatibility tests
5. Bump dashboard version appropriately

## 📚 Resources

- [LibreChat GitHub](https://github.com/danny-avila/LibreChat)
- [LibreChat Docs](https://docs.librechat.ai)
- [MongoDB Aggregation](https://www.mongodb.com/docs/manual/aggregation/)
- [Next.js App Router](https://nextjs.org/docs/app)
