type NuiMessage =
  | {
      action: 'show';
      title?: string;
      text?: string;
    }
  | {
      action: 'hide';
    };
