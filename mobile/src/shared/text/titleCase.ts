export function toTitleCase(input: string): string {
	const value = String(input ?? "").trim();
	if (!value) return "";
	return value
		.toLowerCase()
		.split(/\s+/)
		.map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
		.join(" ");
}
