import type {AlertButton} from 'react-native';

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    const text = title + (message ? '\n\n' + message : '');
    if (!buttons || buttons.length < 2) { window.alert(text); return; }
    const action = buttons.find(button => button.style !== 'cancel');
    const cancel = buttons.find(button => button.style === 'cancel');
    if (window.confirm(text)) action?.onPress?.(); else cancel?.onPress?.();
  },
};
