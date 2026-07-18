CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid,
	"actor_user_id" text,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_event_type_check" CHECK ("audit_events"."event_type" in ('report.created', 'extraction.started', 'extraction.completed', 'extraction.failed', 'incident.edited', 'incident.review_started', 'incident.facts_approved', 'evidence.added', 'evidence.removed', 'scores.calculated', 'matches.generated', 'outreach.generated', 'outreach.subject_copied', 'outreach.body_copied', 'outreach.mailto_opened', 'outreach.contact_attempt_confirmed', 'incident.state_changed')),
	CONSTRAINT "audit_events_metadata_object_check" CHECK (jsonb_typeof("audit_events"."metadata") = 'object')
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"url" text NOT NULL,
	"source_name" text NOT NULL,
	"publisher_domain" text NOT NULL,
	"source_category" text NOT NULL,
	"relationship" text NOT NULL,
	"is_independent" boolean DEFAULT false NOT NULL,
	"note" text,
	"published_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_source_category_check" CHECK ("evidence"."source_category" in ('official_authority', 'established_humanitarian', 'established_news', 'local_news', 'community_eyewitness', 'unknown')),
	CONSTRAINT "evidence_relationship_check" CHECK ("evidence"."relationship" in ('supports', 'contradicts', 'context')),
	CONSTRAINT "evidence_note_length_check" CHECK ("evidence"."note" is null or char_length("evidence"."note") <= 500)
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"source_type" text DEFAULT 'community' NOT NULL,
	"source_url" text,
	"raw_report" text NOT NULL,
	"title" text,
	"summary" text,
	"incident_type" text,
	"country" text DEFAULT 'Bangladesh' NOT NULL,
	"division" text DEFAULT 'Chattogram' NOT NULL,
	"district" text,
	"location_text" text,
	"occurred_at" timestamp with time zone,
	"occurred_at_precision" text DEFAULT 'unknown' NOT NULL,
	"affected_estimate" integer,
	"needs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risk_flags" jsonb DEFAULT '{"accessBlocked":false,"displacement":false,"noFood":false,"noSafeWater":false,"peopleTrapped":false,"urgentMedicalNeed":false,"vulnerableGroupsReported":false}'::jsonb NOT NULL,
	"unknowns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence_score" integer DEFAULT 0 NOT NULL,
	"urgency_score" integer DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'submitted' NOT NULL,
	"facts_approved" boolean DEFAULT false NOT NULL,
	"reviewed_by_user_id" text,
	"reviewed_at" timestamp with time zone,
	"model_id" text,
	"extraction_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incidents_source_type_check" CHECK ("incidents"."source_type" in ('community', 'manual', 'reliefweb')),
	CONSTRAINT "incidents_incident_type_check" CHECK ("incidents"."incident_type" is null or "incidents"."incident_type" in ('flood', 'landslide', 'cyclone', 'fire', 'earthquake', 'displacement', 'food_insecurity', 'water_shortage', 'medical_access', 'other')),
	CONSTRAINT "incidents_country_check" CHECK ("incidents"."country" = 'Bangladesh'),
	CONSTRAINT "incidents_division_check" CHECK ("incidents"."division" = 'Chattogram'),
	CONSTRAINT "incidents_district_check" CHECK ("incidents"."district" is null or "incidents"."district" in ('Cox''s Bazar', 'Chattogram', 'Bandarban', 'Rangamati', 'Khagrachhari', 'Feni', 'Noakhali', 'Lakshmipur', 'Cumilla', 'Chandpur', 'Brahmanbaria', 'Other or Unknown')),
	CONSTRAINT "incidents_occurred_at_precision_check" CHECK ("incidents"."occurred_at_precision" in ('exact', 'approximate', 'unknown')),
	CONSTRAINT "incidents_confidence_score_check" CHECK ("incidents"."confidence_score" between 0 and 100),
	CONSTRAINT "incidents_urgency_score_check" CHECK ("incidents"."urgency_score" between 0 and 100),
	CONSTRAINT "incidents_affected_estimate_check" CHECK ("incidents"."affected_estimate" is null or "incidents"."affected_estimate" >= 0),
	CONSTRAINT "incidents_state_check" CHECK ("incidents"."state" in ('submitted', 'reviewing', 'corroborated', 'outreach_ready', 'contact_attempted', 'closed', 'rejected')),
	CONSTRAINT "incidents_extraction_status_check" CHECK ("incidents"."extraction_status" in ('pending', 'complete', 'failed')),
	CONSTRAINT "incidents_needs_array_check" CHECK (jsonb_typeof("incidents"."needs") = 'array' and "incidents"."needs" <@ '["rescue","shelter","food","water","medical","sanitation","protection","transport","information","other"]'::jsonb and jsonb_array_length("incidents"."needs") <= 10),
	CONSTRAINT "incidents_risk_flags_object_check" CHECK (jsonb_typeof("incidents"."risk_flags") = 'object' and "incidents"."risk_flags" ?& array['peopleTrapped', 'noSafeWater', 'noFood', 'urgentMedicalNeed', 'displacement', 'vulnerableGroupsReported', 'accessBlocked'] and "incidents"."risk_flags" - array['peopleTrapped', 'noSafeWater', 'noFood', 'urgentMedicalNeed', 'displacement', 'vulnerableGroupsReported', 'accessBlocked'] = '{}'::jsonb and jsonb_typeof("incidents"."risk_flags"->'peopleTrapped') = 'boolean' and jsonb_typeof("incidents"."risk_flags"->'noSafeWater') = 'boolean' and jsonb_typeof("incidents"."risk_flags"->'noFood') = 'boolean' and jsonb_typeof("incidents"."risk_flags"->'urgentMedicalNeed') = 'boolean' and jsonb_typeof("incidents"."risk_flags"->'displacement') = 'boolean' and jsonb_typeof("incidents"."risk_flags"->'vulnerableGroupsReported') = 'boolean' and jsonb_typeof("incidents"."risk_flags"->'accessBlocked') = 'boolean'),
	CONSTRAINT "incidents_unknowns_array_check" CHECK (jsonb_typeof("incidents"."unknowns") = 'array' and jsonb_array_length("incidents"."unknowns") <= 10 and not jsonb_path_exists("incidents"."unknowns", '$[*] ? (@.type() != "string")'))
);
--> statement-breakpoint
CREATE TABLE "incident_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_matches_incident_org_unique" UNIQUE("incident_id","organization_id"),
	CONSTRAINT "incident_matches_score_check" CHECK ("incident_matches"."score" between 0 and 100),
	CONSTRAINT "incident_matches_reasons_array_check" CHECK (jsonb_typeof("incident_matches"."reasons") = 'array')
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text NOT NULL,
	"contact_email" text,
	"country" text NOT NULL,
	"areas_served" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sectors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"organization_type" text NOT NULL,
	"review_status" text DEFAULT 'needs_review' NOT NULL,
	"review_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_type_check" CHECK ("organizations"."organization_type" in ('community_group', 'local_ngo', 'national_ngo', 'international_ngo', 'un_agency', 'government', 'other')),
	CONSTRAINT "organizations_review_status_check" CHECK ("organizations"."review_status" in ('reviewed', 'needs_review', 'do_not_contact')),
	CONSTRAINT "organizations_reviewed_at_check" CHECK ("organizations"."is_demo" or "organizations"."review_status" <> 'reviewed' or "organizations"."last_reviewed_at" is not null),
	CONSTRAINT "organizations_areas_array_check" CHECK (jsonb_typeof("organizations"."areas_served") = 'array'),
	CONSTRAINT "organizations_sectors_array_check" CHECK (jsonb_typeof("organizations"."sectors") = 'array' and "organizations"."sectors" <@ '["search_and_rescue","emergency_response","shelter","camp_management","food_assistance","nutrition","water_sanitation_hygiene","health","emergency_medical_support","protection","logistics","emergency_transport","information_management","community_communication","other"]'::jsonb),
	CONSTRAINT "organizations_review_sources_array_check" CHECK (jsonb_typeof("organizations"."review_sources") = 'array')
);
--> statement-breakpoint
CREATE TABLE "outreach_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outreach_drafts_incident_org_unique" UNIQUE("incident_id","organization_id"),
	CONSTRAINT "outreach_drafts_status_check" CHECK ("outreach_drafts"."status" in ('draft', 'copied', 'mailto_opened', 'contact_attempted'))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_matches" ADD CONSTRAINT "incident_matches_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_matches" ADD CONSTRAINT "incident_matches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_incident_created_at_idx" ON "audit_events" USING btree ("incident_id","created_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "evidence_incident_id_idx" ON "evidence" USING btree ("incident_id");--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_reference_uidx" ON "incidents" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "incidents_state_idx" ON "incidents" USING btree ("state");--> statement-breakpoint
CREATE INDEX "incidents_urgency_score_idx" ON "incidents" USING btree ("urgency_score");--> statement-breakpoint
CREATE INDEX "incidents_updated_at_idx" ON "incidents" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "incident_matches_incident_id_idx" ON "incident_matches" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "organizations_review_status_idx" ON "organizations" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "outreach_drafts_incident_id_idx" ON "outreach_drafts" USING btree ("incident_id");