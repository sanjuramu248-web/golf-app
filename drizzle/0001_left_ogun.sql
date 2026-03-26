ALTER TYPE "public"."payment_status" ADD VALUE 'REJECTED';--> statement-breakpoint
CREATE TABLE "charity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"charity_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"event_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"charity_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"provider_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "charities" ALTER COLUMN "is_featured" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "draw_entries" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "draw_entries" ALTER COLUMN "draw_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "draw_entries" ALTER COLUMN "user_numbers" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "draws" ALTER COLUMN "month" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "draws" ALTER COLUMN "year" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "draws" ALTER COLUMN "draw_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "draws" ALTER COLUMN "is_published" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prize_pools" ALTER COLUMN "draw_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prize_pools" ALTER COLUMN "total_pool" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prize_pools" ALTER COLUMN "match5_pool" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prize_pools" ALTER COLUMN "match4_pool" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prize_pools" ALTER COLUMN "match3_pool" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prize_pools" ALTER COLUMN "rollover_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "provider" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_charity" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_charity" ALTER COLUMN "charity_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_charity" ALTER COLUMN "contribution_percent" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "winners" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "winners" ALTER COLUMN "draw_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "winners" ALTER COLUMN "match_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "winners" ALTER COLUMN "prize_amount" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "winners" ALTER COLUMN "is_verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "winners" ALTER COLUMN "payment_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "charities" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "charity_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "user_charity" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_charity" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "winners" ADD COLUMN "rejected_reason" text;--> statement-breakpoint
ALTER TABLE "charity_events" ADD CONSTRAINT "charity_events_charity_id_charities_id_fk" FOREIGN KEY ("charity_id") REFERENCES "public"."charities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_charity_id_charities_id_fk" FOREIGN KEY ("charity_id") REFERENCES "public"."charities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draw_entries" ADD CONSTRAINT "draw_entries_user_id_draw_id_unique" UNIQUE("user_id","draw_id");