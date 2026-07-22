import type { z } from "zod";

const AGENT_NAMES = [
  "monitoring",
  "correlation",
  "classification",
  "verification_official",
  "verification_humanitarian_news",
  "verification_contradiction",
  "verification_consensus",
  "priority",
  "communication",
  "voice",
  "ngo_matching",
  "partner_notification",
  "reporting",
] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

export type AgentContext = {
  jobId: string;
  runId: string;
};

export type StructuredModelRequest<T> = {
  schema: z.ZodType<T>;
  system: string;
  user: string;
};

export type StructuredModelResult<T> = {
  modelId: string;
  output: T;
  provider: string;
};

export interface ModelGateway {
  generateStructured<T>(
    request: StructuredModelRequest<T>,
  ): Promise<StructuredModelResult<T>>;
}

export type ObservationCandidate = {
  canonicalUrl: string | null;
  district: string | null;
  division: string | null;
  excerpt: string | null;
  externalId: string;
  incidentTypeCandidate: string | null;
  publishedAt: Date | null;
  restrictedPayload: Record<string, unknown>;
  title: string | null;
};

type PollResult = {
  cursor: string;
  observations: ObservationCandidate[];
};

export interface SourceConnector {
  poll(input: {
    cursor: string | null;
    endpoint: string;
    signal: AbortSignal;
  }): Promise<PollResult>;
}

export type ApprovedCallRequest = {
  contactAttemptId: string;
  firstMessage: string;
  phoneNumber: string;
};

export interface VoiceProvider {
  startCall(request: ApprovedCallRequest): Promise<{
    providerCallId: string;
    status: string;
  }>;
}
