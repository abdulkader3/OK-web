import * as Print from 'expo-print';
import { Platform } from 'react-native';

export async function printHTML(html: string): Promise<void> {
  if (Platform.OS === 'web') {
    return printHTMLWeb(html);
  }
  return Print.printAsync({
    html,
    margins: {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
  });
}

function printHTMLWeb(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Opening print window...');
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      console.error('Failed to open print window - likely blocked by popup blocker');
      reject(new Error('Unable to open print window. Please check your popup blocker settings and allow popups for this site.'));
      return;
    }

    console.log('Print window opened, writing content...');
    
    const printStyles = `
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        html, body {
          height: auto !important;
          min-height: auto !important;
          overflow: visible !important;
        }
      </style>
    `;
    
    try {
      printWindow.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' + printStyles + '</head><body>' + html + '</body></html>');
      printWindow.document.close();
      console.log('Content written to print window');
    } catch (writeErr) {
      console.error('Error writing to print window:', writeErr);
      reject(new Error('Failed to prepare document for printing. Please try again.'));
      return;
    }

    const tryPrint = () => {
      console.log('Attempting to print...');
      try {
        printWindow.focus();
        printWindow.print();
        console.log('Print dialog opened successfully');
        resolve();
      } catch (printErr) {
        console.error('Error calling print:', printErr);
        reject(new Error('Failed to open print dialog. Please try using your browser\'s print function (Ctrl+P or Cmd+P).'));
      }
    };

    if (printWindow.document.readyState === 'complete') {
      setTimeout(tryPrint, 500);
    } else {
      printWindow.onload = () => {
        setTimeout(tryPrint, 500);
      };
    }
  });
}
