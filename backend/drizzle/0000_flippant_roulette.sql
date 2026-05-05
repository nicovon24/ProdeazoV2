CREATE TABLE "fixtures" (
	"id" integer PRIMARY KEY NOT NULL,
	"home_team_id" integer,
	"away_team_id" integer,
	"date" timestamp NOT NULL,
	"round" text,
	"round_number" integer,
	"group_label" text,
	"league_id" integer,
	"season_id" integer,
	"status" text DEFAULT 'NS',
	"home_score" integer,
	"away_score" integer
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" integer PRIMARY KEY NOT NULL,
	"team_id" integer,
	"name" text NOT NULL,
	"position" text,
	"photo_url" text,
	"number" integer
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fixture_id" integer NOT NULL,
	"home_goals" integer NOT NULL,
	"away_goals" integer NOT NULL,
	"points" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"logo_url" text,
	"group_label" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"google_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;