"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const db_1 = require("./db/db");
const PORT = process.env.PORT || 3000;
(0, db_1.connectionDb)()
    .then(() => {
    app_1.app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}).catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
});
