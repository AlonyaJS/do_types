{
  const resourceName = GetCurrentResourceName();

  on('onResourceStart', (startedResourceName: string) => {
    if (startedResourceName !== resourceName) {
      return;
    }

    console.log(`[${resourceName}] Server started`);
  });
}
