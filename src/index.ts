import "dotenv/config";
import { app } from "./app";
import { connectionDb } from "./db/db";

const PORT = process.env.PORT || 3000;

connectionDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  }).catch((err: any) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
