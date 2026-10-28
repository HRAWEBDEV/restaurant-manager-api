import { OpenAPIHono } from "@hono/zod-openapi";
import { testConnection, closeConnection } from "./db/connect";
import { type Server } from "bun";
import { requestId } from "hono/request-id";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { apiV1Routes } from "./v1/api";
import { serveStatic } from "@hono/bun";

const app = new OpenAPIHono();
let server: Server<undefined> | null = null;

const PORT = process.env.PORT;
if (!PORT) {
  throw new Error("PORT is not defined");
}

// middlewares
app.use(requestId());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(
  secureHeaders({
    crossOriginResourcePolicy: "cross-origin",
  }),
);
//
app.route("/", apiV1Routes);
// static files
app.use("static/*", serveStatic({ root: "./" }));
// docs
async function stopApp(exitCode: number = 1) {
  if (!server) return;
  console.log(`Stopping app...`);
  try {
    server.stop();
    await closeConnection();
    process.exit(exitCode);
  } catch (err) {
    console.log(`Failed to stop app:${err}`);
    process.exit(exitCode);
  }
}

async function startApp() {
  try {
    await testConnection();
    server = Bun.serve({
      fetch: app.fetch,
      port: PORT,
      hostname: "0.0.0.0",
    });
    console.log(`App started on port: ${PORT}`);
  } catch (err) {
    console.log(`Failed to start app:${err}`);
    await stopApp(1);
  }
}

process.on("SIGINT", () => stopApp(0));
process.on("SIGTERM", () => stopApp(0));

startApp();
