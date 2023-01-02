import App from './App.svelte';
import { EiffelVisConnection } from './eiffelvis';
​
export const backend_url: string = process.env.EIFFELVIS_URL.startsWith("@origin")
	? `${window.location.host}${window.location.pathname
	}${process.env.EIFFELVIS_URL.replace("@origin", "")}`
	: process.env.EIFFELVIS_URL.startsWith("@hostname")
		? `${window.location.hostname}${process.env.EIFFELVIS_URL.replace(
			"@hostname",
			""
		)}`
		: process.env.EIFFELVIS_URL;
export const backend_has_ssl = JSON.parse(process.env.EIFFELVIS_SSL);
​
const app = new App({
	target: document.body,
});
​
export default app;