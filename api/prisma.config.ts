// path: prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const resolvedDatasourceUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() || env("DIRECT_URL");

export default defineConfig({
	schema: "prisma/schema.prisma",

	migrations: {
		path: "prisma/migrations",
	},

	datasource: {
		url: resolvedDatasourceUrl,
	},
});
