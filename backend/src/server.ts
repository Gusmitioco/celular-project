import "dotenv/config";
import { app } from "./app.ts";

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
