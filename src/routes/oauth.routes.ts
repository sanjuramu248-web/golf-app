import { Router } from "express";
import { oauthRedirect, oauthCallback } from "../controllers/oauth.controller";

const router = Router();

// GET /api/oauth/:provider — initiates OAuth flow (google, github, facebook)
router.get("/:provider", oauthRedirect);

// POST /api/oauth/callback — frontend exchanges supabase token for app JWT
router.post("/callback", oauthCallback);

export default router;
