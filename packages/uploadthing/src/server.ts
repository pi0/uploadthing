import { getStatusCodeFromError, UploadThingError } from "@uploadthing/shared";
import type { Json } from "@uploadthing/shared";

import { UPLOADTHING_VERSION } from "./constants";
import { formatError } from "./internal/error-formatter";
import type { RouterWithConfig } from "./internal/handler";
import {
  buildPermissionsInfoHandler,
  buildRequestHandler,
} from "./internal/handler";
import { incompatibleNodeGuard } from "./internal/incompat-node-guard";
import { initLogger } from "./internal/logger";
import type { FileRouter } from "./internal/types";
import type { CreateBuilderOptions } from "./internal/upload-builder";
import { createBuilder } from "./internal/upload-builder";

export * from "./internal/types";
export { UTApi } from "./sdk";

export const createUploadthing = <TErrorShape extends Json>(
  opts?: CreateBuilderOptions<TErrorShape>,
) =>
  createBuilder<
    { req: Request; res: undefined; event: undefined },
    TErrorShape
  >(opts);

export interface ResponseWithCleanup extends Response {
  /** custom property where a Promise may be put that you can await in for example Cloudflare Workers */
  cleanup?: Promise<unknown>;
}

/** @internal */
export const INTERNAL_DO_NOT_USE_createRouteHandlerCore = <
  TRouter extends FileRouter,
>(
  opts: RouterWithConfig<TRouter>,
  adapter: string,
) => {
  initLogger(opts.config?.logLevel);
  incompatibleNodeGuard();

  const requestHandler = buildRequestHandler<TRouter>(opts, adapter);
  const getBuildPerms = buildPermissionsInfoHandler<TRouter>(opts);

  const POST = async (
    request: Request | { request: Request },
  ): Promise<Response | ResponseWithCleanup> => {
    const req = request instanceof Request ? request : request.request;
    const response = await requestHandler({ nativeRequest: req });

    if (response instanceof UploadThingError) {
      return new Response(JSON.stringify(formatError(response, opts.router)), {
        status: getStatusCodeFromError(response),
        headers: {
          "x-uploadthing-version": UPLOADTHING_VERSION,
        },
      });
    }
    if (response.status !== 200) {
      // We messed up - this should never happen
      return new Response("An unknown error occured", {
        status: 500,
        headers: {
          "x-uploadthing-version": UPLOADTHING_VERSION,
        },
      });
    }

    const res = new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: {
        "x-uploadthing-version": UPLOADTHING_VERSION,
      },
    });
    // @ts-expect-error - this is a custom property
    res.cleanup = response.cleanup;
    return res as ResponseWithCleanup;
  };

  const GET = (request: Request | { request: Request }) => {
    const _req = request instanceof Request ? request : request.request;

    return new Response(JSON.stringify(getBuildPerms()), {
      status: 200,
      headers: {
        "x-uploadthing-version": UPLOADTHING_VERSION,
      },
    });
  };

  return { GET, POST };
};

export const createRouteHandler = <TRouter extends FileRouter>(
  opts: RouterWithConfig<TRouter>,
) => INTERNAL_DO_NOT_USE_createRouteHandlerCore(opts, "server");

export const extractRouterConfig = (router: FileRouter) =>
  buildPermissionsInfoHandler({ router })();

/**
 * @deprecated Use {@link createRouteHandler} instead
 */
export const createServerHandler = createRouteHandler;
