"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const oauth_controller_1 = require("../controllers/oauth.controller");
const router = (0, express_1.Router)();
router.get("/:provider", oauth_controller_1.oauthRedirect);
router.post("/callback", oauth_controller_1.oauthCallback);
exports.default = router;
