CREATE TABLE "contact_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"organization_id" uuid,
	"escalation_tier" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"idempotency_key" text NOT NULL,
	"approved_by_user_id" text NOT NULL,
	"provider" text,
	"provider_call_id" text,
	"outcome" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "contact_attempts_tier_check" CHECK ("contact_attempts"."escalation_tier" in ('1', '2', '3', '4', '5', '6', '7', '8')),
	CONSTRAINT "contact_attempts_channel_check" CHECK ("contact_attempts"."channel" in ('manual_phone', 'email', 'voice')),
	CONSTRAINT "contact_attempts_status_check" CHECK ("contact_attempts"."status" in ('approved', 'queued', 'in_progress', 'completed', 'failed', 'cancelled')),
	CONSTRAINT "contact_attempts_outcome_object_check" CHECK (jsonb_typeof("contact_attempts"."outcome") = 'object')
);
--> statement-breakpoint
CREATE TABLE "administrative_areas" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"level" text NOT NULL,
	"parent_code" text,
	CONSTRAINT "administrative_areas_level_check" CHECK ("administrative_areas"."level" in ('country', 'division', 'district'))
);
--> statement-breakpoint
CREATE TABLE "monitoring_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"connector_type" text NOT NULL,
	"endpoint" text NOT NULL,
	"trust_tier" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"cursor" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_polled_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_sources_key_unique" UNIQUE("key"),
	CONSTRAINT "monitoring_sources_connector_check" CHECK ("monitoring_sources"."connector_type" in ('community', 'reliefweb', 'ffwc', 'usgs', 'rss')),
	CONSTRAINT "monitoring_sources_trust_tier_check" CHECK ("monitoring_sources"."trust_tier" in ('official', 'humanitarian', 'established_news', 'local_news', 'community')),
	CONSTRAINT "monitoring_sources_settings_object_check" CHECK (jsonb_typeof("monitoring_sources"."settings") = 'object')
);
--> statement-breakpoint
CREATE TABLE "source_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"incident_id" uuid,
	"external_id" text,
	"canonical_url" text,
	"content_hash" text NOT NULL,
	"title" text,
	"excerpt" text,
	"published_at" timestamp with time zone,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"country" text DEFAULT 'Bangladesh' NOT NULL,
	"division" text,
	"district" text,
	"incident_type_candidate" text,
	"restricted_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_observations_source_external_unique" UNIQUE("source_id","external_id"),
	CONSTRAINT "source_observations_source_hash_unique" UNIQUE("source_id","content_hash"),
	CONSTRAINT "source_observations_country_check" CHECK ("source_observations"."country" = 'Bangladesh'),
	CONSTRAINT "source_observations_payload_object_check" CHECK (jsonb_typeof("source_observations"."restricted_payload") = 'object')
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"incident_id" uuid,
	"agent_name" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"input_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_provider" text,
	"model_id" text,
	"error_code" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "agent_runs_name_check" CHECK ("agent_runs"."agent_name" in ('monitoring', 'correlation', 'classification', 'verification', 'priority', 'communication', 'voice', 'ngo_matching', 'reporting')),
	CONSTRAINT "agent_runs_status_check" CHECK ("agent_runs"."status" in ('running', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "workflow_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workflow_jobs_status_check" CHECK ("workflow_jobs"."status" in ('pending', 'running', 'completed', 'failed', 'dead')),
	CONSTRAINT "workflow_jobs_attempts_check" CHECK ("workflow_jobs"."attempt_count" >= 0 and "workflow_jobs"."max_attempts" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_division_check";--> statement-breakpoint
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_district_check";--> statement-breakpoint
ALTER TABLE "evidence" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "observation_id" uuid;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "created_by_agent_run_id" uuid;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "origin" text DEFAULT 'user_report' NOT NULL;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "division_code" text;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "district_code" text;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "verification_status" text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
UPDATE "incidents" SET "verification_status" = 'operator_approved' WHERE "facts_approved" = true;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "priority_level" text DEFAULT 'P3' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "escalation_tier" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "automation_allowed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "operating_notes" text;--> statement-breakpoint
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_approved_by_user_id_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "administrative_areas" ADD CONSTRAINT "administrative_areas_parent_code_administrative_areas_code_fk" FOREIGN KEY ("parent_code") REFERENCES "public"."administrative_areas"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_observations" ADD CONSTRAINT "source_observations_source_id_monitoring_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."monitoring_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_observations" ADD CONSTRAINT "source_observations_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_job_id_workflow_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."workflow_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_attempts_idempotency_uidx" ON "contact_attempts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "contact_attempts_incident_created_idx" ON "contact_attempts" USING btree ("incident_id","created_at");--> statement-breakpoint
CREATE INDEX "administrative_areas_parent_idx" ON "administrative_areas" USING btree ("parent_code");--> statement-breakpoint
CREATE INDEX "monitoring_sources_enabled_idx" ON "monitoring_sources" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "source_observations_incident_idx" ON "source_observations" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "source_observations_observed_idx" ON "source_observations" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "agent_runs_job_idx" ON "agent_runs" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "agent_runs_incident_started_idx" ON "agent_runs" USING btree ("incident_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_jobs_idempotency_uidx" ON "workflow_jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "workflow_jobs_claim_idx" ON "workflow_jobs" USING btree ("status","available_at","locked_until");--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_observation_id_source_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."source_observations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_created_by_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("created_by_agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_division_code_administrative_areas_code_fk" FOREIGN KEY ("division_code") REFERENCES "public"."administrative_areas"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_district_code_administrative_areas_code_fk" FOREIGN KEY ("district_code") REFERENCES "public"."administrative_areas"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_incident_observation_unique" UNIQUE("incident_id","observation_id");--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_actor_check" CHECK (num_nonnulls("evidence"."created_by_user_id", "evidence"."created_by_agent_run_id") = 1);--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_origin_check" CHECK ("incidents"."origin" in ('user_report', 'automatic', 'operator'));--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_verification_status_check" CHECK ("incidents"."verification_status" in ('unverified', 'agent_review', 'agent_corroborated', 'operator_approved', 'contradicted', 'rejected'));--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_priority_level_check" CHECK ("incidents"."priority_level" in ('P0', 'P1', 'P2', 'P3'));--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_escalation_tier_check" CHECK ("organizations"."escalation_tier" between 1 and 8);
