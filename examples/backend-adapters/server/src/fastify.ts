import Fastify from "fastify";

import "dotenv/config";

import { createRouteHandler } from "uploadthing/fastify";

import { uploadRouter } from "./router";

const fastify = Fastify({ logger: true });
fastify.get("/api", async () => "Hello from Fastify!");

fastify.register(createRouteHandler, {
  router: uploadRouter,
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
