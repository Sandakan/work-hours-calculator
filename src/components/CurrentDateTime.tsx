import { useEffect, useState } from 'react';

export function CurrentDateTime() {
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(interval);
	}, []);

	const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

	return (
		<div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl px-4 py-2.5 shadow-sm">
			<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
			<div className="text-right">
				<div id="current-datetime" className="text-sm font-semibold text-foreground tabular-nums">
					{timeStr}
				</div>
				<div className="text-xs text-muted-foreground">{dateStr}</div>
			</div>
		</div>
	);
}
