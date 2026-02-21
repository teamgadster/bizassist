//src/components/system/BAITimeAgo.tsx;

import React, { useEffect, useMemo, useState } from "react";
import { BAIText } from "@/components/ui/BAIText";

type Props = {
	/** ISO 8601 timestamp from backend */
	value: string | Date;

	/** Optional text variant */
	variant?: React.ComponentProps<typeof BAIText>["variant"];

	/** Muted text */
	muted?: boolean;

	/** Auto refresh interval (ms). Default: 60s */
	refreshIntervalMs?: number;
};

function toDate(v: string | Date): Date {
	return v instanceof Date ? v : new Date(v);
}

function formatRelativeTimeFallback(date: Date): string {
	const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
	if (!Number.isFinite(diffSeconds)) return "just now";

	const isPast = diffSeconds < 0;
	const absSeconds = Math.abs(diffSeconds);

	if (absSeconds < 60) return isPast ? "just now" : "in a moment";

	const minutes = Math.floor(absSeconds / 60);
	if (minutes < 60) return isPast ? `${minutes}m ago` : `in ${minutes}m`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return isPast ? `${hours}h ago` : `in ${hours}h`;

	const days = Math.floor(hours / 24);
	if (days < 7) return isPast ? `${days}d ago` : `in ${days}d`;

	const weeks = Math.floor(days / 7);
	if (weeks < 5) return isPast ? `${weeks}w ago` : `in ${weeks}w`;

	const months = Math.floor(days / 30);
	if (months < 12) return isPast ? `${months}mo ago` : `in ${months}mo`;

	const years = Math.floor(days / 365);
	return isPast ? `${years}y ago` : `in ${years}y`;
}

function getRelativeTime(date: Date) {
	if (!Number.isFinite(date.getTime())) return "—";

	const now = Date.now();
	const diffSeconds = Math.round((date.getTime() - now) / 1000);

	if (typeof Intl === "undefined" || typeof Intl.RelativeTimeFormat !== "function") {
		return formatRelativeTimeFallback(date);
	}

	try {
		const rtf = new Intl.RelativeTimeFormat(undefined, {
			numeric: "auto",
		});

		const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
			[60, "second"],
			[60, "minute"],
			[24, "hour"],
			[7, "day"],
			[4.34524, "week"],
			[12, "month"],
			[Number.POSITIVE_INFINITY, "year"],
		];

		let duration = diffSeconds;
		let unit: Intl.RelativeTimeFormatUnit = "second";

		for (const [amount, nextUnit] of divisions) {
			if (Math.abs(duration) < amount) {
				unit = nextUnit;
				break;
			}
			duration /= amount;
		}

		return rtf.format(Math.round(duration), unit);
	} catch {
		return formatRelativeTimeFallback(date);
	}
}

export function BAITimeAgo({ value, variant = "caption", muted = true, refreshIntervalMs = 60_000 }: Props) {
	const date = useMemo(() => toDate(value), [value]);
	const [label, setLabel] = useState(() => getRelativeTime(date));

	useEffect(() => {
		setLabel(getRelativeTime(date));

		const id = setInterval(() => {
			setLabel(getRelativeTime(date));
		}, refreshIntervalMs);

		return () => clearInterval(id);
	}, [date, refreshIntervalMs]);

	return (
		<BAIText variant={variant} muted={muted}>
			{label}
		</BAIText>
	);
}
