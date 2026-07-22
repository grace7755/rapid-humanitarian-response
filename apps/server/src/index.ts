import {
  processWorkflowBatch,
  runMonitoringCycle,
} from "@my-better-t-app/api/agents/orchestrator";
import { createContext } from "@my-better-t-app/api/context";
import { publicErrorBody } from "@my-better-t-app/api/errors";
import { appRouter } from "@my-better-t-app/api/routers/index";
import { recordSafeError } from "@my-better-t-app/api/services/logging";
import {
  notificationStatusFromResendEvent,
  verifyResendWebhook,
} from "@my-better-t-app/api/services/resend-webhook";
import { auth } from "@my-better-t-app/auth";
import {
  claimNotificationWebhookEvent,
  recordPartnerNotificationEvent,
} from "@my-better-t-app/db/queries/notifications";
import { env } from "@my-better-t-app/env/server";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { initLogger } from "evlog";
import { type EvlogVariables, evlog } from "evlog/hono";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";

initLogger({
  env: { service: "rapid-humanitarian-response-server" },
});

const app = new Hono<EvlogVariables>();

export function shouldExposeApiReference(nodeEnv: string) {
  return nodeEnv === "development";
}

app.use("*", requestId());
app.use(evlog());

app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/", (c) => c.text("Rapid Humanitarian Response API running"));

app.get("/internal/cron/monitor", async (c) => {
  if (!env.CRON_SECRET) {
    return c.json({ error: { code: "CRON_NOT_CONFIGURED" } }, 503);
  }
  if (c.req.header("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return c.json({ error: { code: "UNAUTHORIZED" } }, 401);
  }
  if (!env.MONITORING_ENABLED) {
    const workflow = await processWorkflowBatch();
    return c.json({
      externalMonitoring: "disabled" as const,
      status: "completed" as const,
      workflow,
    });
  }
  const result = await runMonitoringCycle();
  return c.json({ ...result, status: "completed" as const });
});

app.post("/webhooks/resend", async (c) => {
  if (!env.RESEND_WEBHOOK_SECRET) {
    return c.json({ error: { code: "WEBHOOK_NOT_CONFIGURED" } }, 503);
  }
  const id = c.req.header("svix-id");
  const timestamp = c.req.header("svix-timestamp");
  const signature = c.req.header("svix-signature");
  if (!id || !timestamp || !signature) {
    return c.json({ error: { code: "INVALID_WEBHOOK" } }, 400);
  }
  try {
    const payload = await c.req.text();
    const event = await verifyResendWebhook({
      id,
      payload,
      secret: env.RESEND_WEBHOOK_SECRET,
      signature,
      timestamp,
    });
    const claimed = await claimNotificationWebhookEvent(id, event.type);
    if (!claimed) return c.json({ duplicate: true, received: true });
    const status = notificationStatusFromResendEvent(event.type);
    if (status) {
      await recordPartnerNotificationEvent({
        outcome: { eventCreatedAt: event.created_at, eventType: event.type },
        providerMessageId: event.data.email_id,
        status,
      });
    }
    return c.json({ received: true });
  } catch {
    return c.json({ error: { code: "INVALID_WEBHOOK" } }, 400);
  }
});

app.use(
  "/rpc/*",
  bodyLimit({
    maxSize: 64 * 1024,
    onError: (c) => {
      const requestIdValue = c.get("requestId");
      c.get("log").setLevel("warn");
      c.get("log").set({
        requestId: requestIdValue,
        status: 413,
        validationResult: "rejected",
      });
      return c.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "The request body is too large.",
            requestId: requestIdValue,
          },
        },
        413,
      );
    },
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const apiHandler = shouldExposeApiReference(env.NODE_ENV)
  ? new OpenAPIHandler(appRouter, {
      plugins: [
        new OpenAPIReferencePlugin({
          schemaConverters: [new ZodToJsonSchemaConverter()],
        }),
      ],
      interceptors: [
        onError((error, options) => {
          recordSafeError(options.context.log, error, {
            requestId: options.context.requestId,
          });
        }),
      ],
    })
  : undefined;

const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error, options) => {
      recordSafeError(options.context.log, error, {
        requestId: options.context.requestId,
      });
    }),
  ],
});

app.use("/*", async (c, next) => {
  const startedAt = performance.now();
  const context = await createContext({ context: c });
  const procedure = new URL(c.req.url).pathname
    .replace(/^\/rpc\/?/, "")
    .replaceAll("/", ".");

  c.get("log").set({
    procedure: procedure || undefined,
    requestId: context.requestId,
  });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    c.get("log").set({
      duration: Math.round(performance.now() - startedAt),
      status: rpcResult.response.status,
    });
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  if (apiHandler) {
    const apiResult = await apiHandler.handle(c.req.raw, {
      prefix: "/api-reference",
      context: context,
    });

    if (apiResult.matched) {
      return c.newResponse(apiResult.response.body, apiResult.response);
    }
  }

  await next();
});

app.notFound((c) => {
  return c.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        requestId: c.get("requestId"),
      },
    },
    404,
  );
});

app.onError((error, c) => {
  const requestIdValue = c.get("requestId");
  recordSafeError(c.get("log"), error, {
    requestId: requestIdValue,
    status: 500,
  });
  return c.json(publicErrorBody(requestIdValue), 500);
});

export default app;
