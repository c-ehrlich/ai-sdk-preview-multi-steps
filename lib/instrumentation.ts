import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import "dotenv/config";

console.log("tktk env", {
  AXIOM_TRACING_URL: process.env.AXIOM_TRACING_URL,
  AXIOM_TRACING_TOKEN: process.env.AXIOM_TRACING_TOKEN,
  AXIOM_TRACING_DATASET: process.env.AXIOM_TRACING_DATASET,
});
const AXIOM_TRACING_URL = process.env.AXIOM_TRACING_URL;

const traceExporter = (function () {
  let url = AXIOM_TRACING_URL;
  if (url) {
    // Platform is giving us something like this otlp+http://some.host:4318
    //
    // We need to replace otlp+http: with http: as the OTLPTraceExporter will otherwise assume HTTPS (and fail).
    // You cannot replace the protocol part of a URL object on Node.js, so we do this manually.
    // See https://github.com/nodejs/node/issues/49319
    url = url.replace("otlp+http:", "http:");
    // OTLPTraceExporter also doesn't automatically add the /v1/traces path, so we need to do that as well.
    const parsedUrl = new URL(url);
    parsedUrl.pathname = "/v1/traces";
    url = parsedUrl.toString();
  }

  console.debug(`Using trace exporter URL: '${url}'`);

  const headers: Record<string, string> = {};
  if (process.env.AXIOM_TRACING_TOKEN) {
    headers.Authorization = `Bearer ${process.env.AXIOM_TRACING_TOKEN}`;
  }
  if (process.env.AXIOM_TRACING_DATASET) {
    headers["x-axiom-dataset"] = process.env.AXIOM_TRACING_DATASET;
  }

  return new OTLPTraceExporter({
    url: url,
    headers: headers,
  });
})();

export const telemetry = AXIOM_TRACING_URL
  ? new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "frontend-server",
      }),
      traceExporter: traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations(),
        new ExpressInstrumentation(),
        new HttpInstrumentation(),
      ],
    })
  : undefined;
