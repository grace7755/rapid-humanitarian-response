import { describe, expect, it } from "vitest";

import { hashObservation, UsgsConnector } from "./connectors.js";

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
});
