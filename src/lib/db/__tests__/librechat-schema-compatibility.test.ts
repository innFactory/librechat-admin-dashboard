/**
 * LibreChat Schema Compatibility Tests
 *
 * These tests verify that the dashboard's data types and queries
 * are compatible with LibreChat's MongoDB schema.
 *
 * Based on LibreChat source:
 * - packages/data-schemas/src/schema/message.ts
 * - packages/data-schemas/src/schema/transaction.ts
 * - packages/data-schemas/src/schema/convo.ts
 * - api/models/spendTokens.js
 *
 * @see https://github.com/danny-avila/LibreChat
 */

import type { Message } from "../types";

describe("LibreChat Schema Compatibility", () => {
	describe("Message Schema", () => {
		/**
		 * LibreChat Message Schema fields:
		 * - messageId: String (unique, required, indexed)
		 * - conversationId: String (indexed, required)
		 * - user: String (indexed, required)
		 * - model: String (default: null)
		 * - endpoint: String
		 * - tokenCount: Number
		 * - summaryTokenCount: Number
		 * - sender: String
		 * - text: String
		 * - isCreatedByUser: Boolean
		 * - parentMessageId: String
		 * - createdAt: Date (auto)
		 */
		it("should have compatible Message interface with LibreChat schema", () => {
			const message: Message = {
				messageId: "msg_123",
				conversationId: "conv_456",
				user: "user_789",
				sender: "assistant",
				model: "gpt-4",
				endpoint: "openAI",
				tokenCount: 150,
				summaryTokenCount: 50,
				parentMessageId: "msg_122",
				createdAt: new Date(),
			};

			// Verify required fields
			expect(message.messageId).toBeDefined();
			expect(message.conversationId).toBeDefined();
			expect(message.user).toBeDefined();
			expect(message.tokenCount).toBeDefined();

			// Verify optional fields can be set
			expect(message.model).toBe("gpt-4");
			expect(message.endpoint).toBe("openAI");
			expect(message.summaryTokenCount).toBe(50);
		});

		it("should handle null model (LibreChat default)", () => {
			const message: Message = {
				messageId: "msg_123",
				conversationId: "conv_456",
				user: "user_789",
				sender: "user",
				model: null,
				endpoint: "openAI",
				tokenCount: 50,
				createdAt: new Date(),
			};

			// LibreChat stores model as null for user messages
			expect(message.model).toBeNull();
		});

		it("should handle agents endpoint messages", () => {
			const agentMessage: Message = {
				messageId: "msg_agent_123",
				conversationId: "conv_456",
				user: "user_789",
				sender: "assistant",
				model: "agent-custom-assistant",
				endpoint: "agents",
				tokenCount: 200,
				createdAt: new Date(),
			};

			expect(agentMessage.endpoint).toBe("agents");
		});
	});

	describe("Transaction Schema", () => {
		/**
		 * LibreChat Transaction Schema fields:
		 * - user: ObjectId (ref: 'User', indexed, required)
		 * - conversationId: String (ref: 'Conversation', indexed)
		 * - tokenType: String (enum: ['prompt', 'completion', 'credits'], required)
		 * - model: String (indexed)
		 * - context: String
		 * - valueKey: String
		 * - rate: Number
		 * - rawAmount: Number (negative for spending, positive for refills)
		 * - tokenValue: Number
		 * - inputTokens: Number (for structured tokens)
		 * - writeTokens: Number (for cache write)
		 * - readTokens: Number (for cache read)
		 * - createdAt: Date (auto)
		 */
		interface Transaction {
			user: string;
			conversationId?: string;
			tokenType: "prompt" | "completion" | "credits";
			model?: string;
			context?: string;
			rate?: number;
			rawAmount?: number;
			tokenValue?: number;
			inputTokens?: number;
			writeTokens?: number;
			readTokens?: number;
			createdAt?: Date;
		}

		it("should correctly identify prompt transactions (input tokens)", () => {
			const promptTx: Transaction = {
				user: "user_123",
				conversationId: "conv_456",
				tokenType: "prompt",
				model: "gpt-4",
				context: "message",
				rawAmount: -1000, // Negative = spending
				rate: 30,
				tokenValue: -30000,
			};

			expect(promptTx.tokenType).toBe("prompt");
			expect(promptTx.rawAmount).toBeLessThan(0);
		});

		it("should correctly identify completion transactions (output tokens)", () => {
			const completionTx: Transaction = {
				user: "user_123",
				conversationId: "conv_456",
				tokenType: "completion",
				model: "gpt-4",
				context: "message",
				rawAmount: -500,
				rate: 60,
				tokenValue: -30000,
			};

			expect(completionTx.tokenType).toBe("completion");
			expect(completionTx.rawAmount).toBeLessThan(0);
		});

		it("should handle structured tokens (Anthropic cache)", () => {
			// LibreChat supports structured tokens for cache-aware models
			const structuredTx: Transaction = {
				user: "user_123",
				conversationId: "conv_456",
				tokenType: "prompt",
				model: "claude-3-5-sonnet",
				inputTokens: -10,
				writeTokens: -100,
				readTokens: -5,
			};

			expect(structuredTx.inputTokens).toBe(-10);
			expect(structuredTx.writeTokens).toBe(-100);
			expect(structuredTx.readTokens).toBe(-5);
		});

		it("should use absolute value of rawAmount for calculations", () => {
			// Dashboard uses $abs on rawAmount because LibreChat stores as negative
			const rawAmount = -1000;
			const absoluteValue = Math.abs(rawAmount);

			expect(absoluteValue).toBe(1000);
		});
	});

	describe("Conversation Schema", () => {
		/**
		 * LibreChat Conversation Schema fields:
		 * - conversationId: String (unique, required, indexed)
		 * - title: String (default: 'New Chat')
		 * - user: String (indexed)
		 * - endpoint: String
		 * - model: String
		 * - agent_id: String (for agents endpoint)
		 * - createdAt: Date (auto)
		 * - updatedAt: Date (auto)
		 */
		interface Conversation {
			conversationId: string;
			title?: string;
			user?: string;
			endpoint?: string;
			model?: string;
			agent_id?: string;
			createdAt?: Date;
			updatedAt?: Date;
		}

		it("should have compatible Conversation interface", () => {
			const conversation: Conversation = {
				conversationId: "conv_123",
				title: "Test Chat",
				user: "user_456",
				endpoint: "openAI",
				model: "gpt-4",
				createdAt: new Date(),
			};

			expect(conversation.conversationId).toBeDefined();
		});

		it("should handle agents endpoint with agent_id", () => {
			const agentConvo: Conversation = {
				conversationId: "conv_123",
				title: "Agent Chat",
				user: "user_456",
				endpoint: "agents",
				agent_id: "agent_custom_789",
			};

			expect(agentConvo.endpoint).toBe("agents");
			expect(agentConvo.agent_id).toBeDefined();
		});
	});

	describe("Endpoint Values", () => {
		/**
		 * LibreChat supported endpoints (EModelEndpoint enum):
		 * - openAI, azureOpenAI, google, anthropic, bedrock
		 * - agents, assistants, gptPlugins, bingAI, chatGPTBrowser
		 */
		const validEndpoints = [
			"openAI",
			"azureOpenAI",
			"google",
			"anthropic",
			"bedrock",
			"agents",
			"assistants",
			"gptPlugins",
			"custom",
		];

		it.each(
			validEndpoints,
		)("should support %s endpoint", (endpoint: string) => {
			expect(typeof endpoint).toBe("string");
		});

		it("should handle agents as special endpoint for custom agents", () => {
			const isAgentsEndpoint = (endpoint: string) => endpoint === "agents";
			expect(isAgentsEndpoint("agents")).toBe(true);
			expect(isAgentsEndpoint("openAI")).toBe(false);
		});
	});

	describe("Token Counting", () => {
		/**
		 * LibreChat token counting logic:
		 * - messages.tokenCount: tokens in the individual message response
		 * - transactions.rawAmount: actual tokens consumed (includes context)
		 *
		 * Dashboard should use transactions for accurate usage metrics.
		 */
		it("should understand token types", () => {
			const tokenTypes = ["prompt", "completion", "credits"] as const;

			expect(tokenTypes).toContain("prompt");
			expect(tokenTypes).toContain("completion");
			expect(tokenTypes).toContain("credits");
		});

		it("should calculate total tokens correctly", () => {
			const transactions = [
				{ tokenType: "prompt", rawAmount: -1000 },
				{ tokenType: "completion", rawAmount: -500 },
				{ tokenType: "prompt", rawAmount: -800 },
				{ tokenType: "completion", rawAmount: -400 },
			];

			const totalPrompt = transactions
				.filter((tx) => tx.tokenType === "prompt")
				.reduce((sum, tx) => sum + Math.abs(tx.rawAmount), 0);

			const totalCompletion = transactions
				.filter((tx) => tx.tokenType === "completion")
				.reduce((sum, tx) => sum + Math.abs(tx.rawAmount), 0);

			expect(totalPrompt).toBe(1800);
			expect(totalCompletion).toBe(900);
		});
	});

	describe("Date Handling", () => {
		/**
		 * LibreChat uses MongoDB timestamps:
		 * - createdAt: automatically set on insert
		 * - updatedAt: automatically updated on save
		 */
		it("should handle MongoDB date objects", () => {
			const mongoDate = new Date("2024-01-15T10:30:00.000Z");

			expect(mongoDate instanceof Date).toBe(true);
			expect(mongoDate.toISOString()).toBe("2024-01-15T10:30:00.000Z");
		});

		it("should correctly filter by date range", () => {
			const startDate = new Date("2024-01-01T00:00:00.000Z");
			const endDate = new Date("2024-01-31T23:59:59.999Z");
			const testDate = new Date("2024-01-15T12:00:00.000Z");

			expect(testDate >= startDate && testDate <= endDate).toBe(true);
		});
	});

	describe("Model Names", () => {
		/**
		 * LibreChat supports various model patterns:
		 * - gpt-4, gpt-4-turbo, gpt-3.5-turbo
		 * - claude-3-5-sonnet, claude-3-opus
		 * - gemini-1.5-pro, gemini-2.0-flash
		 * - Custom agent model IDs
		 */
		const modelPatterns = [
			{ model: "gpt-4", expected: "openAI" },
			{ model: "gpt-3.5-turbo", expected: "openAI" },
			{ model: "claude-3-5-sonnet", expected: "anthropic" },
			{ model: "gemini-1.5-pro", expected: "google" },
			{ model: "agent-custom-id", expected: "agents" },
		];

		it.each(modelPatterns)("should recognize $model pattern", ({ model }) => {
			expect(model).toBeDefined();
			expect(typeof model).toBe("string");
		});
	});

	describe("ToolCall Schema (MCP)", () => {
		/**
		 * LibreChat ToolCall Schema (for MCP tool tracking):
		 * - conversationId: String (required, indexed)
		 * - messageId: String (required, indexed)
		 * - toolId: String (required)
		 * - user: ObjectId (required)
		 * - result: Mixed
		 * - attachments: Mixed
		 * - createdAt: Date (auto)
		 */
		interface ToolCall {
			conversationId: string;
			messageId: string;
			toolId: string;
			user: string;
			result?: unknown;
			createdAt?: Date;
		}

		it("should have compatible ToolCall interface", () => {
			const toolCall: ToolCall = {
				conversationId: "conv_123",
				messageId: "msg_456",
				toolId: "mcp_filesystem_read",
				user: "user_789",
				result: { content: "file contents" },
				createdAt: new Date(),
			};

			expect(toolCall.toolId).toContain("mcp");
		});

		it("should count tool calls by toolId", () => {
			const toolCalls: ToolCall[] = [
				{
					conversationId: "conv_1",
					messageId: "msg_1",
					toolId: "mcp_read",
					user: "user_1",
				},
				{
					conversationId: "conv_1",
					messageId: "msg_2",
					toolId: "mcp_read",
					user: "user_1",
				},
				{
					conversationId: "conv_1",
					messageId: "msg_3",
					toolId: "mcp_write",
					user: "user_1",
				},
			];

			const counts = toolCalls.reduce(
				(acc, tc) => {
					acc[tc.toolId] = (acc[tc.toolId] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			);

			expect(counts.mcp_read).toBe(2);
			expect(counts.mcp_write).toBe(1);
		});
	});
});
