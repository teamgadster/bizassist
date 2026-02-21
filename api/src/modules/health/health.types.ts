// path: src/modules/health/health.types.ts
export interface HealthStatus {
	status: "ok";
	service: string;
	timestamp: string;
	env: string;
}
