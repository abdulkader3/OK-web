import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function printHTML(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    const isMobile = isMobileDevice();
    if (isMobile) {
      return printHTMLMobileWeb(html);
    }
    return printHTMLDesktopWeb(html);
  }
  return Print.printAsync({ html });
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function printHTMLMobileWeb(html: string): Promise<void> {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Print PDF',
      });
    } else {
      const printResult = await Print.printAsync({ html });
      return printResult;
    }
  } catch (err) {
    console.error('Mobile web print error:', err);
    throw err;
  }
}

function printHTMLDesktopWeb(html: string): Promise<void> {
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
          (iframe as unknown as { contentWindow: { print?: () => void } }).contentWindow?.print?.();
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
