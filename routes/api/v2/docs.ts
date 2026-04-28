import { Handlers } from "$fresh/server.ts";
import { ResponseUtil } from "$lib/utils/api/responses/responseUtil.ts";
import { parse as parseYaml } from "@std/yaml";
import { fromFileUrl, join } from "@std/path";
import { RouteType } from "$server/services/infrastructure/cacheService.ts";

const __dirname = fromFileUrl(new URL(".", import.meta.url));
const schemaPath = join(__dirname, "../../../schema.yml");
const schemaContent = await Deno.readTextFile(schemaPath);
const openApiSchema = parseYaml(schemaContent) as Record<string, unknown>;

// Helper function to resolve $ref in schemas
function resolveRef(ref: string): Record<string, unknown> | null {
  const path = ref.replace("#/components/schemas/", "").split("/");
  let schema = (openApiSchema as any).components?.schemas as Record<
    string,
    unknown
  >;

  for (const segment of path) {
    if (!schema || typeof schema !== "object") return null;
    schema = schema[segment] as Record<string, unknown>;
  }

  return schema;
}

// Helper function to expand schema references
function expandSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema) return {};

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref as string);
    return resolved ? expandSchema(resolved) : {};
  }

  const expanded: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === "object" && value !== null) {
      if ("$ref" in value) {
        expanded[key] = expandSchema(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        expanded[key] = value.map((item) =>
          typeof item === "object" && item !== null
            ? expandSchema(item as Record<string, unknown>)
            : item
        );
      } else {
        expanded[key] = expandSchema(value as Record<string, unknown>);
      }
    } else {
      expanded[key] = value;
    }
  }

  return expanded;
}

// Helper function to format endpoint documentation
function formatEndpointDocs(path: string, pathData: Record<string, unknown>) {
  const methods = Object.keys(pathData);
  return methods.map((method) => {
    const methodData = pathData[method] as Record<string, unknown>;
    const responses = Object.entries(methodData.responses || {}).map(
      ([code, response]) => {
        const expandedResponse = expandSchema(
          response as Record<string, unknown>,
        );
        return {
          code,
          ...expandedResponse,
        };
      },
    );

    return {
      path,
      method: method.toUpperCase(),
      summary: methodData.summary || "",
      description: methodData.description || "",
      tags: methodData.tags || [],
      parameters: methodData.parameters
        ? (methodData.parameters as unknown[]).map((param) =>
          expandSchema(param as Record<string, unknown>)
        )
        : [],
      requestBody: methodData.requestBody
        ? expandSchema(methodData.requestBody as Record<string, unknown>)
        : null,
      responses,
    };
  });
}

export const handler: Handlers = {
  GET(req) {
    const url = new URL(req.url);
    const path = url.searchParams.get("path");
    const tag = url.searchParams.get("tag");

    const paths = openApiSchema.paths as Record<string, unknown>;

    // If no filters, return full OpenAPI documentation
    if (!path && !tag) {
      return ResponseUtil.success({
        openapi: openApiSchema.openapi,
        info: openApiSchema.info,
        paths: openApiSchema.paths,
        tags: openApiSchema.tags,
        servers: openApiSchema.servers,
      }, { routeType: RouteType.STATIC });
    }

    // For filtered responses (by path or tag)
    let filteredDocs: unknown[] = [];

    if (path) {
      // Return documentation for specific endpoint
      const pathData = paths[path];
      if (pathData) {
        filteredDocs = formatEndpointDocs(
          path,
          pathData as Record<string, unknown>,
        );
      }
    } else if (tag) {
      // Return all endpoints for a specific tag
      Object.entries(paths).forEach(([path, pathData]) => {
        const endpointDocs = formatEndpointDocs(
          path,
          pathData as Record<string, unknown>,
        );
        filteredDocs.push(
          ...endpointDocs.filter((doc) => (doc.tags as string[]).includes(tag)),
        );
      });
    }

    // Return filtered documentation in the correct format
    return ResponseUtil.success({
      documentation: filteredDocs.map((doc: any) => ({
        path: doc.path,
        method: doc.method,
        summary: doc.summary,
        description: doc.description,
        tags: doc.tags,
        parameters: doc.parameters || [],
        requestBody: doc.requestBody,
        responses: doc.responses.map((response: any) => ({
          code: response.code,
          description: response.description,
          content: response.content,
        })),
      })),
    }, { routeType: RouteType.STATIC });
  },
};
