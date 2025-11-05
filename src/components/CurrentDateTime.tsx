import { useEffect, useState } from 'react';

export function CurrentDateTime() {
	const [dateTime, setDateTime] = useState(new Date().toLocaleString());

	useEffect(() => {
		const interval = setInterval(() => {
			setDateTime(new Date().toLocaleString());
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="text-right">
			<div id="current-datetime" className="text-sm muted">
				{dateTime}
			</div>
			<div className="text-xs muted">Local time</div>
		</div>
	);
}
