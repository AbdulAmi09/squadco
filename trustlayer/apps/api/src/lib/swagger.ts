import swaggerJSDoc from "swagger-jsdoc";
import { env } from "./env.js";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TrustLayer API",
      version: "0.1.0",
      description: "Developer API for transaction risk analysis, customer onboarding, credit scoring, assistant chat, and webhooks."
    },
    servers: [
      { url: `http://localhost:${env.port}`, description: "Local API" }
    ],
    components: {
      securitySchemes: {
        trustlayerApiKey: {
          type: "apiKey",
          in: "header",
          name: "x-trustlayer-key"
        }
      },
      schemas: {
        TransactionAnalyzeRequest: {
          type: "object",
          required: ["customer_id", "amount"],
          properties: {
            customer_id: { type: "string", format: "uuid" },
            amount: { type: "integer", example: 300000, description: "Amount in kobo" },
            currency: { type: "string", example: "NGN" },
            merchant: { type: "string", example: "POS Terminal" },
            location: { type: "string", example: "Abuja" },
            device_id: { type: "string", example: "device_abc" },
            channel: { type: "string", example: "mobile" }
          }
        },
        CustomerRegisterRequest: {
          type: "object",
          required: ["external_id"],
          properties: {
            external_id: { type: "string", example: "customer_123" },
            bvn_hash: { type: "string" },
            phone_hash: { type: "string" }
          }
        },
        CreditAnalyzeRequest: {
          type: "object",
          required: ["customer_id", "data_type", "data"],
          properties: {
            customer_id: { type: "string", format: "uuid" },
            data_type: { type: "string", example: "bank_statement" },
            data: { type: "object", additionalProperties: true }
          }
        },
        AssistantChatRequest: {
          type: "object",
          required: ["customer_id", "message"],
          properties: {
            customer_id: { type: "string", format: "uuid" },
            message: { type: "string" },
            history: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  role: { type: "string" },
                  content: { type: "string" }
                }
              }
            }
          }
        },
        WebhookRegisterRequest: {
          type: "object",
          required: ["url", "events", "secret"],
          properties: {
            url: { type: "string", format: "uri" },
            events: { type: "array", items: { type: "string" } },
            secret: { type: "string" }
          }
        }
      }
    },
    security: [{ trustlayerApiKey: [] }],
    paths: {
      "/v1/transaction/analyze": {
        post: {
          summary: "Analyze a transaction",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TransactionAnalyzeRequest" }
              }
            }
          },
          responses: {
            "200": { description: "Transaction analyzed" }
          }
        }
      },
      "/v1/customer/register": {
        post: {
          summary: "Register a bank customer",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CustomerRegisterRequest" }
              }
            }
          },
          responses: {
            "201": { description: "Customer created" }
          }
        }
      },
      "/v1/customer/{externalId}/profile": {
        get: {
          summary: "Get customer profile",
          parameters: [
            {
              in: "path",
              name: "externalId",
              required: true,
              schema: { type: "string" }
            }
          ],
          responses: {
            "200": { description: "Customer profile returned" }
          }
        }
      },
      "/v1/credit/analyze": {
        post: {
          summary: "Analyze customer credit",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreditAnalyzeRequest" }
              }
            }
          },
          responses: {
            "200": { description: "Credit result returned" }
          }
        }
      },
      "/v1/assistant/chat": {
        post: {
          summary: "Chat with the embedded assistant",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssistantChatRequest" }
              }
            }
          },
          responses: {
            "200": { description: "Assistant reply returned" }
          }
        }
      },
      "/v1/webhooks/register": {
        post: {
          summary: "Register a webhook",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WebhookRegisterRequest" }
              }
            }
          },
          responses: {
            "201": { description: "Webhook created" }
          }
        }
      }
    }
  },
  apis: []
});
