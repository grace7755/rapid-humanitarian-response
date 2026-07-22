import { describe, expect, it } from "vitest";

import {
  createConnector,
  hashObservation,
  UsgsConnector,
} from "./connectors.js";

const insideBangladesh = {
  geometry: { coordinates: [90.4, 23.8, 10] },
  id: "bd-event",
  properties: {
    mag: 4.2,
    place: "Central Bangladesh",
    time: Date.parse("2026-07-22T08:00:00.000Z"),
    title: "M 4.2 - Central Bangladesh",
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/bd-event",
  },
};

describe("official monitoring connectors", () => {
  it("keeps only USGS observations inside the Bangladesh bounding box", async () => {
    const connector = new UsgsConnector(
      (async () =>
        new Response(
          JSON.stringify({
            features: [
              insideBangladesh,
              {
                ...insideBangladesh,
                geometry: { coordinates: [100, 23.8, 10] },
                id: "outside-event",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        )) as unknown as typeof fetch,
    );

    const result = await connector.poll({
      cursor: null,
      endpoint: "https://example.test/usgs.geojson",
      signal: new AbortController().signal,
    });

    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]).toMatchObject({
      externalId: "bd-event",
      incidentTypeCandidate: "earthquake",
    });
  });

  it("keeps in-bounds events when the place omits the country name", async () => {
    const connector = new UsgsConnector(
      (async () =>
        new Response(
          JSON.stringify({
            features: [
              {
                ...insideBangladesh,
                id: "dhaka-event",
                properties: {
                  ...insideBangladesh.properties,
                  place: "10 km north of Dhaka",
                },
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        )) as unknown as typeof fetch,
    );

    const result = await connector.poll({
      cursor: null,
      endpoint: "https://example.test/usgs.geojson",
      signal: new AbortController().signal,
    });

    expect(result.observations).toHaveLength(1);
  });

  it("creates a stable observation hash without storing full source content", async () => {
    const candidate = {
      canonicalUrl: insideBangladesh.properties.url,
      district: null,
      division: null,
      excerpt: "Magnitude 4.2",
      externalId: insideBangladesh.id,
      incidentTypeCandidate: "earthquake",
      publishedAt: new Date(insideBangladesh.properties.time),
      restrictedPayload: {},
      title: insideBangladesh.properties.title,
    };

    expect(await hashObservation(candidate)).toBe(
      await hashObservation({ ...candidate, excerpt: "Changed excerpt" }),
    );
  });

  it("turns FFWC danger-level records into official flood observations", async () => {
    const connector = createConnector(
      "ffwc",
      (async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                danger_level: 5,
                district: "Feni",
                id: "station-1",
                observed_at: "2026-07-22T08:00:00.000Z",
                station_name: "Feni River",
                status: "Flood",
                water_level: 5.4,
              },
            ],
          }),
        )) as unknown as typeof fetch,
    );

    const result = await connector.poll({
      cursor: null,
      endpoint: "https://api.ffwc.gov.bd/warnings",
      signal: new AbortController().signal,
    });

    expect(result.observations[0]).toMatchObject({
      district: "Feni",
      externalId: "station-1",
      incidentTypeCandidate: "flood",
    });
  });

  it("parses approved RSS feeds into source observations", async () => {
    const connector = createConnector(
      "rss",
      (async () =>
        new Response(`<?xml version="1.0"?><rss><channel><item>
          <guid>story-1</guid><title>Flood in Feni</title>
          <link>https://news.example/story-1</link>
          <description>Water entered homes.</description>
          <pubDate>Wed, 22 Jul 2026 08:00:00 GMT</pubDate>
        </item></channel></rss>`)) as unknown as typeof fetch,
    );

    const result = await connector.poll({
      cursor: null,
      endpoint: "https://news.example/feed.xml",
      signal: new AbortController().signal,
    });

    expect(result.observations[0]).toMatchObject({
      canonicalUrl: "https://news.example/story-1",
      externalId: "story-1",
      incidentTypeCandidate: "flood",
    });
  });
});
