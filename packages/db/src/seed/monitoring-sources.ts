import type { NewMonitoringSource } from "../schema/index.js";

export const DEFAULT_MONITORING_SOURCES = [
  {
    id: "9cc607da-a19e-4a80-bdbc-e2273291e657",
    key: "community-report",
    name: "Community emergency reports",
    connectorType: "community",
    endpoint: "internal://public-report",
    trustTier: "community",
    enabled: false,
  },
  {
    id: "5d76c62f-d962-43af-84a4-5b33ff1d71ef",
    key: "reliefweb-bangladesh",
    name: "ReliefWeb Bangladesh",
    connectorType: "reliefweb",
    endpoint: "https://api.reliefweb.int/v2/reports",
    trustTier: "humanitarian",
    enabled: false,
  },
  {
    id: "c47cf98a-4843-4121-8185-5ebf18241b9f",
    key: "ffwc-bangladesh",
    name: "Flood Forecasting and Warning Centre",
    connectorType: "ffwc",
    endpoint: "https://api.ffwc.gov.bd/",
    trustTier: "official",
    enabled: false,
  },
  {
    id: "cd15359d-07f6-4f41-96ef-4f07b6e910fb",
    key: "usgs-bangladesh",
    name: "USGS earthquakes near Bangladesh",
    connectorType: "usgs",
    endpoint:
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    trustTier: "official",
    enabled: false,
  },
] satisfies NewMonitoringSource[];
