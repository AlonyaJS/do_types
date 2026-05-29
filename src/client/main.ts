{
  const resourceName = GetCurrentResourceName();

  on('onClientResourceStart', (startedResourceName: string) => {
    if (startedResourceName !== resourceName) {
      return;
    }

    console.log(`[${resourceName}] Client started`);
  });

  RegisterCommand(
    'showtestpanel',
    () => {
      const message: NuiMessage = {
        action: 'show',
        title: 'Test Panel',
        text: 'Hello from the FiveM client.'
      };

      SendNUIMessage(message);
      SetNuiFocus(true, true);
    },
    false
  );

  RegisterNuiCallback('testButton', (_data: unknown, cb: (response: { ok: boolean }) => void) => {
    console.log(`[${resourceName}] NUI button clicked`);

    cb({ ok: true });
  });

  RegisterNuiCallback('hidePanel', (_data: unknown, cb: (response: { ok: boolean }) => void) => {
    const message: NuiMessage = {
      action: 'hide'
    };

    SendNUIMessage(message);
    SetNuiFocus(false, false);
    cb({ ok: true });
  });
}
