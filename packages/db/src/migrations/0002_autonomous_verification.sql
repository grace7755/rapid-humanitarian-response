ALTER TABLE "incidents" ADD COLUMN "verification_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "verification_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "consensus_at" timestamp with time zone;--> statement-breakpoint

UPDATE "incidents" SET
  "source_type" = CASE WHEN "source_type" = 'manual' THEN 'community' ELSE "source_type" END,
  "origin" = CASE WHEN "origin" = 'operator' THEN 'automatic' ELSE "origin" END,
  "state" = CASE
    WHEN "state" = 'closed' THEN 'closed'
    WHEN "state" = 'contact_attempted' THEN 'notified'
    WHEN "state" = 'rejected' THEN 'inconclusive'
    ELSE 'verifying'
  END,
  "verification_status" = CASE
    WHEN "verification_status" = 'contradicted' THEN 'contradicted'
    WHEN "verification_status" = 'rejected' THEN 'inconclusive'
    ELSE 'pending'
  END;--> statement-breakpoint

ALTER TABLE "incidents" DROP CONSTRAINT "incidents_source_type_check";--> statement-breakpoint
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_origin_check";--> statement-breakpoint
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_state_check";--> statement-breakpoint
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_verification_status_check";--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_source_type_check" CHECK ("source_type" in ('community', 'reliefweb'));--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_origin_check" CHECK ("origin" in ('user_report', 'automatic'));--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_state_check" CHECK ("state" in ('submitted', 'verifying', 'corroborated', 'escalation_ready', 'notified', 'inconclusive', 'contradicted', 'closed'));--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_verification_status_check" CHECK ("verification_status" in ('pending', 'corroborated', 'inconclusive', 'contradicted', 'expired'));--> statement-breakpoint
ALTER TABLE "incidents" DROP COLUMN "facts_approved";--> statement-breakpoint
ALTER TABLE "incidents" DROP COLUMN "reviewed_by_user_id";--> statement-breakpoint
ALTER TABLE "incidents" DROP COLUMN "reviewed_at";--> statement-breakpoint

ALTER TABLE "agent_runs" DROP CONSTRAINT "agent_runs_name_check";--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_name_check" CHECK ("agent_name" in ('monitoring', 'correlation', 'classification', 'verification_official', 'verification_humanitarian_news', 'verification_contradiction', 'verification_consensus', 'priority', 'communication', 'ngo_matching', 'partner_notification', 'reporting'));--> statement-breakpoint

CREATE TABLE "verification_verdicts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "incident_id" uuid NOT NULL,
  "revision" integer NOT NULL,
  "agent_run_id" uuid NOT NULL,
  "verifier_role" text NOT NULL,
  "verdict" text NOT NULL,
  "confidence_score" integer NOT NULL,
  "source_domains" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source_families" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "evidence_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "verification_verdicts_incident_revision_role_unique" UNIQUE("incident_id", "revision", "verifier_role"),
  CONSTRAINT "verification_verdicts_role_check" CHECK ("verifier_role" in ('official_sources', 'humanitarian_news', 'contradiction')),
  CONSTRAINT "verification_verdicts_verdict_check" CHECK ("verdict" in ('supports', 'contradicts', 'inconclusive')),
  CONSTRAINT "verification_verdicts_confidence_check" CHECK ("confidence_score" between 0 and 100)
);--> statement-breakpoint
ALTER TABLE "verification_verdicts" ADD CONSTRAINT "verification_verdicts_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "verification_verdicts" ADD CONSTRAINT "verification_verdicts_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE cascade;--> statement-breakpoint
CREATE INDEX "verification_verdicts_incident_revision_idx" ON "verification_verdicts" ("incident_id", "revision");--> statement-breakpoint

CREATE TABLE "partner_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "incident_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "verification_revision" integer NOT NULL,
  "agent_run_id" uuid NOT NULL,
  "recipient_email" text NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "idempotency_key" text NOT NULL,
  "provider" text DEFAULT 'resend' NOT NULL,
  "provider_message_id" text,
  "outcome" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  CONSTRAINT "partner_notifications_status_check" CHECK ("status" in ('queued', 'sent', 'delivered', 'delayed', 'bounced', 'failed'))
);--> statement-breakpoint
ALTER TABLE "partner_notifications" ADD CONSTRAINT "partner_notifications_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "partner_notifications" ADD CONSTRAINT "partner_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");--> statement-breakpoint
ALTER TABLE "partner_notifications" ADD CONSTRAINT "partner_notifications_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "partner_notifications_idempotency_uidx" ON "partner_notifications" ("idempotency_key");--> statement-breakpoint
CREATE INDEX "partner_notifications_incident_created_idx" ON "partner_notifications" ("incident_id", "created_at");--> statement-breakpoint
CREATE INDEX "partner_notifications_provider_message_idx" ON "partner_notifications" ("provider_message_id");--> statement-breakpoint

CREATE TABLE "notification_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE IF EXISTS "contact_attempts" RENAME TO "legacy_contact_attempts";--> statement-breakpoint
ALTER TABLE IF EXISTS "outreach_drafts" RENAME TO "legacy_outreach_drafts";--> statement-breakpoint

ALTER TABLE "audit_events" DROP CONSTRAINT "audit_events_event_type_check";--> statement-breakpoint
UPDATE "audit_events"
SET "metadata" = "metadata" || jsonb_build_object('legacyEventType', "event_type"),
    "event_type" = 'legacy.human_action'
WHERE "event_type" NOT IN ('report.created', 'extraction.started', 'extraction.completed', 'extraction.failed', 'evidence.added', 'scores.calculated', 'matches.generated', 'incident.state_changed');--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_event_type_check" CHECK ("event_type" in ('report.created', 'extraction.started', 'extraction.completed', 'extraction.failed', 'evidence.added', 'verification.completed', 'verification.expired', 'scores.calculated', 'matches.generated', 'partner_notification.sent', 'partner_notification.delivered', 'partner_notification.failed', 'incident.state_changed', 'legacy.human_action'));
