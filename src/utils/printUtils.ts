import * as Print from 'expo-print';
import { Platform } from 'react-native';

export async function printHTML(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    return printHTMLWeb(html);
  }
  return Print.printAsync({ html });
}

function printHTMLWeb(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '800px';
    iframe.style.height = 'auto';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      reject(new Error('Failed to create iframe document'));
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    const cleanup = () => {
      try {
        document.body.removeChild(iframe);
      } catch {
        // Ignore cleanup errors
      }
    };

    const tryPrint = () => {
      try {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } else {
          iframe.focus();
          (iframe as any).contentWindow?.print?.();
        }
        cleanup();
        resolve();
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    if (iframe.contentWindow?.document?.readyState === 'complete') {
      setTimeout(tryPrint, 100);
    } else {
      iframe.onload = () => {
        setTimeout(tryPrint, 100);
      };
    }
  });
}
