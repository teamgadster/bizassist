// path: src/core/config/http.ts
import type { CorsOptions } from "cors";
import { env } from "@/core/config/env";

export const corsOptions: CorsOptions = {
	origin: env.corsOrigin,
	credentials: true,
};
