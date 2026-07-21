import { z } from "zod";

import type { ObservationCandidate, SourceConnector } from "./contracts.js";

const reliefWebResponseSchema = z.object({
  data: z.array(
    z.object({
      fields: z
        .object({
          body: z.string().optional(),
          date: z.object({ created: z.string().optional() }).optional(),
          disaster_type: z.array(z.object({ name: z.string() })).optional(),
          primary_country: z.object({ name: z.string() }).optional(),
          title: z.string().optional(),
        })
        .passthrough(),
      href: z.string().optional(),
      id: z.union([z.number(), z.string()]),
    }),
  ),
});

const usgsResponseSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({
        coordinates: z.tuple([z.number(), z.number()]).rest(z.number()),
      }),
      id: z.string(),
      properties: z.object({
        mag: z.number().nullable(),
        place: z.string().nullable(),
        time: z.number(),
        title: z.string().nullable(),
        url: z.string().nullable(),
      }),
    }),
  ),
});

const BANGLADESH_BOUNDS = {
  east: 92.8,
  north: 26.8,
  south: 20.5,
  west: 88,
} as const;

function cleanText(value: string | undefined) {
  if (!value) return null;
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2_000);
}

function mapDisasterType(value: string | undefined) {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("flood")) return "flood";
  if (normalized.includes("landslide")) return "landslide";
  if (normalized.includes("cyclone") || normalized.includes("storm"))
    return "cyclone";
  if (normalized.includes("fire")) return "fire";
  if (normalized.includes("earthquake")) return "earthquake";
  return null;
}

async function fetchJson(
  fetchImplementation: typeof fetch,
  url: string,
  signal: AbortSignal,
) {
  const response = await fetchImplementation(url, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("SOURCE_HTTP_ERROR");
  return response.json();
}

export class ReliefWebConnector implements SourceConnector {
  constructor(
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly appName?: string,
  ) {}

  async poll(input: Parameters<SourceConnector["poll"]>[0]) {
    if (!this.appName) throw new Error("SOURCE_NOT_CONFIGURED");
    const url = new URL(input.endpoint);
    url.searchParams.set("appname", this.appName);
    url.searchParams.set("limit", "50");
    url.searchParams.set("sort[]", "date.created:desc");
    url.searchParams.set("filter[field]", "primary_country.name");
    url.searchParams.set("filter[value]", "Bangladesh");
    for (const field of [
      "title",
      "body",
      "date.created",
      "disaster_type.name",
      "primary_country.name",
    ]) {
      url.searchParams.append("fields[include][]", field);
    }

    const parsed = reliefWebResponseSchema.parse(
      await fetchJson(this.fetchImplementation, url.toString(), input.signal),
    );
    const observations: ObservationCandidate[] = parsed.data.map((item) => {
      const publishedAt = item.fields.date?.created
        ? new Date(item.fields.date.created)
        : null;
      return {
        canonicalUrl: item.href ?? null,
        district: null,
        division: null,
        excerpt: cleanText(item.fields.body),
        externalId: String(item.id),
        incidentTypeCandidate: mapDisasterType(
          item.fields.disaster_type?.[0]?.name,
        ),
        publishedAt,
        restrictedPayload: {},
        title: item.fields.title ?? null,
      };
    });
    return {
      cursor:
        observations
          .map((item) => item.publishedAt?.toISOString())
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ??
        input.cursor ??
        new Date().toISOString(),
      observations,
    };
  }
}

export class UsgsConnector implements SourceConnector {
  constructor(private readonly fetchImplementation: typeof fetch = fetch) {}

  async poll(input: Parameters<SourceConnector["poll"]>[0]) {
    const parsed = usgsResponseSchema.parse(
      await fetchJson(this.fetchImplementation, input.endpoint, input.signal),
    );
    const observations = parsed.features
      .filter((feature) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        return (
          longitude >= BANGLADESH_BOUNDS.west &&
          longitude <= BANGLADESH_BOUNDS.east &&
          latitude >= BANGLADESH_BOUNDS.south &&
          latitude <= BANGLADESH_BOUNDS.north
        );
      })
      .map<ObservationCandidate>((feature) => ({
        canonicalUrl: feature.properties.url,
        district: null,
        division: null,
        excerpt:
          feature.properties.mag === null
            ? feature.properties.place
            : `Magnitude ${feature.properties.mag}; ${feature.properties.place ?? "location unavailable"}`,
        externalId: feature.id,
        incidentTypeCandidate: "earthquake",
        publishedAt: new Date(feature.properties.time),
        restrictedPayload: {
          coordinates: feature.geometry.coordinates,
          magnitude: feature.properties.mag,
        },
        title: feature.properties.title,
      }));
    return {
      cursor:
        observations
          .map((item) => item.publishedAt?.toISOString())
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ??
        input.cursor ??
        new Date().toISOString(),
      observations,
    };
  }
}

class ConfigurationRequiredConnector implements SourceConnector {
  async poll(): Promise<never> {
    throw new Error("SOURCE_NOT_CONFIGURED");
  }
}

export function createConnector(
  connectorType: string,
  fetchImplementation: typeof fetch = fetch,
  options: { reliefWebAppName?: string } = {},
): SourceConnector {
  if (connectorType === "reliefweb") {
    return new ReliefWebConnector(
      fetchImplementation,
      options.reliefWebAppName,
    );
  }
  if (connectorType === "usgs") return new UsgsConnector(fetchImplementation);
  if (connectorType === "ffwc" || connectorType === "rss") {
    return new ConfigurationRequiredConnector();
  }
  throw new Error("CONNECTOR_NOT_SUPPORTED");
}

export async function hashObservation(candidate: ObservationCandidate) {
  const stableValue = JSON.stringify({
    externalId: candidate.externalId,
    publishedAt: candidate.publishedAt?.toISOString() ?? null,
    title: candidate.title,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stableValue),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
