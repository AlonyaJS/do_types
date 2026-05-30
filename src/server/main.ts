on('onResourceStart', (resourceName: string) => {
	if (resourceName !== GetCurrentResourceName()) {
		return;
	}

	console.log(`[${resourceName}] Server started`);
});
