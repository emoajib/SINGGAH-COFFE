import { ThermalPrinter } from '@finan-me/react-native-thermal-printer';
import { PermissionsAndroid, Platform } from 'react-native';
import type { Product } from '../types';
import { formatNumber } from '../lib/utils';

export interface PrinterSettings {
  printer_connection: 'network' | 'bluetooth' | 'usb';
  printer_ip?: string;
  printer_bluetooth_address?: string;
  printer_width: '58mm' | '80mm';
  auto_print?: string;
}

export interface ReceiptData {
  orderNumber: string;
  items: { productId: number; quantity: number }[];
  products: Product[];
  subtotal: number;
  serviceFee: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashierName: string;
  outletName?: string;
  outletAddress?: string;
  logoUrl?: string;
}

class PrinterService {
  /**
   * Request Bluetooth permissions (Android only)
   */
  private async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 31) {
        // Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        return (
          granted['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
          granted['android.permission.BLUETOOTH_CONNECT'] === 'granted'
        );
      } else {
        // Android 11 and below
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === 'granted';
      }
    } catch (err) {
      console.warn('Bluetooth permission error', err);
      return false;
    }
  }

  /**
   * Get printer address based on settings and connection type
   */
  private getPrinterAddress(settings: PrinterSettings): string | null {
    if (settings.printer_connection === 'network' && settings.printer_ip) {
      return `lan:${settings.printer_ip}:9100`;
    }
    
    if (settings.printer_connection === 'bluetooth' && settings.printer_bluetooth_address) {
      // Validate MAC address format (basic check)
      const macRegex = /^([0-9A-F]{2}[:]){5}([0-9A-F]{2})$/i;
      if (macRegex.test(settings.printer_bluetooth_address)) {
        return `bt:${settings.printer_bluetooth_address}`;
      }
    }

    return null;
  }

  /**
   * Get paper width in mm from settings
   */
  private getPaperWidthMM(width: '58mm' | '80mm'): number {
    return width === '58mm' ? 58 : 80;
  }

  /**
   * Convert receipt data to ThermalPrinter document format
   */
  private buildReceiptDocument(data: ReceiptData, paperWidthMM: number): any[][] {
    const document: any[][] = [[]]; // Start with one printer/job

    // Header
    document[0].push(
      { type: 'text', content: data.outletName || 'Singgah Coffee', style: { align: 'center', bold: true, size: 'double' } },
      { type: 'text', content: data.outletAddress || '', style: { align: 'center' } },
      { type: 'line' }
    );

    // Logo (if URL provided)
    if (data.logoUrl) {
      document[0].push({ type: 'image', uri: data.logoUrl });
    }

    // Order info
    document[0].push(
      { type: 'text', content: `Order: ${data.orderNumber}`, style: { align: 'left' } },
      { type: 'text', content: `Cashier: ${data.cashierName}`, style: { align: 'left' } },
      { type: 'text', content: new Date().toLocaleString(), style: { align: 'left' } },
      { type: 'line' }
    );

    // Items table
    const itemsData = data.items.map(item => {
      const product = data.products.find(p => p.id === item.productId);
      if (!product) return null;
      
      return [
        product.name,
        item.quantity.toString(),
        formatNumber((product.price || 0) * item.quantity)
      ];
    }).filter(Boolean) as string[][];

    if (itemsData.length > 0) {
      document[0].push(
        { type: 'table', headers: ['Item', 'Qty', 'Price'], rows: itemsData, 
          columnWidths: [50, 20, 30], alignments: ['left', 'center', 'right'] }
      );
    }

    // Totals
    document[0].push(
      { type: 'line' },
      { type: 'text', content: `Subtotal: ${formatNumber(data.subtotal)}`, style: { align: 'right' } },
      data.serviceFee > 0 ? { type: 'text', content: `Service (${data.serviceFee > 0 ? data.serviceFee : 0}%): ${formatNumber(data.serviceFee)}`, style: { align: 'right' } } : null,
      data.tax > 0 ? { type: 'text', content: `Tax (${data.tax > 0 ? data.tax : 0}%): ${formatNumber(data.tax)}`, style: { align: 'right' } } : null,
      { type: 'text', content: `TOTAL: ${formatNumber(data.total)}`, style: { align: 'right', bold: true, size: 'double_width' } },
      { type: 'text', content: `Payment: ${data.paymentMethod}`, style: { align: 'left' } },
      { type: 'line' }
    );

    // Footer
    document[0].push(
      { type: 'text', content: 'Thank you for your visit!', style: { align: 'center' } },
      { type: 'feed', lines: 3 },
      { type: 'cut' }
    );

    // Remove null values
    return document.map(job => job.filter(Boolean));
  }

  /**
   * Print receipt using Bluetooth/Network printer
   */
  async printReceipt(settings: PrinterSettings, data: ReceiptData): Promise<void> {
    try {
      // Request permissions first
      const hasPermission = await this.requestBluetoothPermissions();
      if (!hasPermission) {
        throw new Error('Bluetooth permissions required for printing');
      }

      // Get printer address
      const printerAddress = this.getPrinterAddress(settings);
      if (!printerAddress) {
        throw new Error('Printer not configured properly. Please check printer settings.');
      }

      // Get paper width
      const paperWidthMM = this.getPaperWidthMM(settings.printer_width);

      // Build receipt document
      const document = this.buildReceiptDocument(data, paperWidthMM);

      // Prepare print job
      const job = {
        printers: [
          {
            address: printerAddress,
            options: {
              paperWidthMm: paperWidthMM,
              marginMm: 0, // No margin for receipt
            },
          },
        ],
        documents: document,
      };

      // Print
      await ThermalPrinter.printReceipt(job);
    } catch (error) {
      console.error('Printing failed:', error);
      throw error;
    }
  }

  /**
   * Scan for available Bluetooth printers (for setup)
   * Note: This library doesn't expose direct scanning, so we return a placeholder
   * In a real implementation, you would use platform-specific Bluetooth APIs
   */
  async scanBluetoothPrinters(): Promise<any> {
    try {
      const hasPermission = await this.requestBluetoothPermissions();
      if (!hasPermission) {
        throw new Error('Bluetooth permissions required for scanning');
      }
        
      // Since the thermal printer library doesn't expose scanning functionality,
      // we inform the user to pair devices through system settings
      return { 
        success: true, 
        message: 'Please pair your Bluetooth printer through system settings, then enter the MAC address in printer settings',
        devices: [] 
      };
    } catch (error) {
      console.error('Failed to scan printers:', error);
      throw error;
    }
  }
}

export const printerService = new PrinterService();