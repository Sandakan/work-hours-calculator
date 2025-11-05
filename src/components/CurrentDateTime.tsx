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
		<div className="text-right bg-white/50 backdrop-blur-sm rounded-lg px-4 py-3 border border-gray-200 shadow-sm">
			<div className="flex items-center justify-end gap-2 mb-1">
				<span className="text-lg">🕐</span>
				<div id="current-datetime" className="text-sm font-medium text-gray-700">
					{dateTime}
				</div>
			</div>
			<div className="text-xs text-gray-500">Local time</div>
		</div>
	);
}
