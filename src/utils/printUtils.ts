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
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      reject(new Error('Unable to open print window. Please check your popup blocker settings.'));
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 250);
    };

    if (printWindow.document.readyState === 'complete') {
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
          resolve();
        } catch (err) {
          reject(err);
        }
      }, 250);
    }
  });
}
