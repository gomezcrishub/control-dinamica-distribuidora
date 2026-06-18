import { useState, useEffect, useMemo, FormEvent } from 'react';
import { 
  ShoppingCart, 
  Warehouse, 
  FileText, 
  RefreshCw, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  ExternalLink, 
  Download, 
  Upload, 
  X, 
  User, 
  DollarSign, 
  TrendingUp, 
  Briefcase, 
  Check, 
  Layers, 
  HelpCircle,
  Hash,
  Database,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// Product Type definition
interface Product {
  id: number;
  name: string;
  barcode: string | null;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  category: string;
}

// Transaction Type definition
interface Sale {
  id: string | number;
  timestamp: number;
  sellerName: string;
  totalAmount: number;
  totalProfit: number;
  items: {
    productName: string;
    quantity: number;
    sellingPrice: number;
  }[];
}

// Cart Item layout
interface CartItem {
  product: Product;
  quantity: number;
}

const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: "Gaseosa Cola 1.5L", barcode: "7791234560012", costPrice: 120.00, sellingPrice: 200.00, stock: 24, unit: "botellas", category: "Bebidas" },
  { id: 2, name: "Alfajor de Chocolate Premium", barcode: "7791234560029", costPrice: 50.00, sellingPrice: 95.00, stock: 45, unit: "unidades", category: "Alimentos" },
  { id: 3, name: "Cerveza Lager Lata Importada", barcode: "7791234560036", costPrice: 95.00, sellingPrice: 160.00, stock: 12, unit: "botellas", category: "Bebidas" },
  { id: 4, name: "Papas Fritas Gourmet Bolsa", barcode: "7791234560043", costPrice: 110.00, sellingPrice: 185.00, stock: 8, unit: "unidades", category: "Alimentos" },
  { id: 5, name: "Agua Mineral Natural 500ml", barcode: "7791234560050", costPrice: 40.00, sellingPrice: 75.00, stock: 50, unit: "botellas", category: "Bebidas" },
  { id: 6, name: "Café de Especialidad 250g", barcode: "7791234560067", costPrice: 350.00, sellingPrice: 600.00, stock: 15, unit: "unidades", category: "Cafetería" }
];

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'sales' | 'sync'>('pos');

  // Business Databases
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);

  // Enlaces de integración fijos de DINAMICA (Sincronización centralizada)
  const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/1cQ9t7W9vsO_CxkYFxPTikUh5dBUrweaxh8yFqi_vUQk/edit?usp=sharing';
  const appsScriptUrl = 'https://script.google.com/macros/s/AKfycbwdi7tcPafRqkiVbTikmGczjfPSiqBRSkITJ6sbSZ1sNfv7_4q81L65clj8aoZ8Drzm/exec';

  // Search & Filter
  const [posSearchQuery, setPosSearchQuery] = useState('');
  const [posSelectedCategory, setPosSelectedCategory] = useState<string>('all');
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('Admin Principal');

  // Client Payment Calculator values
  const [receivedCash, setReceivedCash] = useState<string>('');

  // Toast Alerts system values
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Online connection tracker status
  const [isOnline, setIsOnline] = useState(true);

  // Modal forms management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form states
  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCost, setFormCost] = useState<number>(0);
  const [formSelling, setFormSelling] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(0);
  const [formUnit, setFormUnit] = useState('unidades');
  const [formCategory, setFormCategory] = useState('Alimentos');

  // Load custom database from localStorage
  useEffect(() => {
    const loadedProds = localStorage.getItem('dinamica_products');
    if (loadedProds) {
      try {
        setProducts(JSON.parse(loadedProds));
      } catch (e) {
        setProducts(INITIAL_PRODUCTS);
      }
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem('dinamica_products', JSON.stringify(INITIAL_PRODUCTS));
    }

    const loadedSales = localStorage.getItem('dinamica_sales');
    if (loadedSales) {
      try {
        setSales(JSON.parse(loadedSales));
      } catch (e) {}
    }

    // Enlaces de sincronización fijos de la app

    // Online Status Manager
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  // Perform silent initial synchronization on startup
  useEffect(() => {
    downloadDatabaseFromGoogleSheets(true);
  }, []);

  // Save changes to localStorage helper
  const saveProductsToStorage = (updatedList: Product[]) => {
    setProducts(updatedList);
    localStorage.setItem('dinamica_products', JSON.stringify(updatedList));
  };

  const saveSalesToStorage = (updatedSales: Sale[]) => {
    setSales(updatedSales);
    localStorage.setItem('dinamica_sales', JSON.stringify(updatedSales));
  };

  // Helper trigger Toast notifications
  const triggerToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
  };

  // Auto-dismiss Toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle unique list of categories of seeded products helper
  const categoriesList = useMemo(() => {
    const list = new Set(products.map(p => p.category));
    return ['all', ...Array.from(list)];
  }, [products]);

  // POS filtered products list helper
  const filteredPOSProducts = useMemo(() => {
    return products.filter(p => {
      const query = posSearchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(query);
      const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(query) : false;
      const matchCat = posSelectedCategory === 'all' || p.category === posSelectedCategory;
      return (matchName || matchBarcode) && matchCat;
    });
  }, [products, posSearchQuery, posSelectedCategory]);

  // Inventory filtered products list helper
  const filteredInventoryProducts = useMemo(() => {
    return products.filter(p => {
      const query = inventorySearchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(query);
      const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(query) : false;
      const matchCat = p.category.toLowerCase().includes(query);
      return matchName || matchBarcode || matchCat;
    });
  }, [products, inventorySearchQuery]);

  // Compute overall financial summaries
  const financialStats = useMemo(() => {
    return sales.reduce(
      (acc, s) => {
        acc.revenue += s.totalAmount;
        acc.profit += s.totalProfit;
        return acc;
      },
      { revenue: 0, profit: 0 }
    );
  }, [sales]);

  // Add Product to Cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      triggerToast(`Sin stock disponible de ${product.name}`, 'error');
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.stock) {
        triggerToast(`Artículos en el carrito superan el stock disponible (${product.stock})`, 'error');
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    triggerToast(`Agregado al carrito: ${product.name}`, 'success');
  };

  // Update Cart Quantity
  const updateCartQty = (productId: number, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.product.id !== productId));
    } else {
      if (newQty > item.product.stock) {
        triggerToast(`Stock insuficiente de ${item.product.name} (${item.product.stock})`, 'error');
        return;
      }
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
    }
  };

  // Remove direct product from cart
  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Empty cart helper
  const clearCart = () => {
    setCart([]);
    setReceivedCash('');
  };

  // Compute Cart overall Total
  const cartStatistics = useMemo(() => {
    return cart.reduce(
      (acc, val) => {
        const costPrice = val.product.costPrice * val.quantity;
        const sellingPrice = val.product.sellingPrice * val.quantity;
        acc.totalPrice += sellingPrice;
        acc.totalProfit += (sellingPrice - costPrice);
        acc.totalItems += val.quantity;
        return acc;
      },
      { totalPrice: 0, totalProfit: 0, totalItems: 0 }
    );
  }, [cart]);

  // Calculate change for elegant interface
  const calculatedChange = useMemo(() => {
    const cashVal = parseFloat(receivedCash);
    if (isNaN(cashVal) || cashVal < cartStatistics.totalPrice) return 0;
    return cashVal - cartStatistics.totalPrice;
  }, [receivedCash, cartStatistics.totalPrice]);

  // Sync to Sheet Helper - extract ID
  const extractSheetId = (urlStr: string) => {
    if (urlStr.includes('/d/')) {
      const parts = urlStr.split('/d/');
      if (parts.length > 1) {
        return parts[1].split('/')[0];
      }
    }
    return null;
  };

  // Download inventory database directly from CSV with fallback CORS/Web endpoints
  const downloadFromGoogleSheets = async (silent = false) => {
    if (!silent) triggerToast('Consultando existencias e inventario en Google Sheets...', 'info');
    const sheetId = extractSheetId(googleSheetUrl);
    if (!sheetId) {
      if (!silent) triggerToast('La URL de Google Sheet ingresada no es válida', 'error');
      return false;
    }

    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=inventario`;

    try {
      const controller = new AbortController();
      const idTimeout = setTimeout(() => controller.abort(), 8000); // 8 sec limit

      const response = await fetch(csvExportUrl, { signal: controller.signal });
      clearTimeout(idTimeout);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const csvData = await response.text();
      if (!csvData || csvData.includes('<!DOCTYPE html')) {
        throw new Error('La respuesta recibida no parece ser un archivo CSV válido. Verifica que la pestaña se llame "inventario" y que el Google Sheet tenga los permisos para ser leído por cualquier persona con el enlace.');
      }

      const parsedProducts = parseCsvToProducts(csvData);
      if (parsedProducts && parsedProducts.length > 0) {
        saveProductsToStorage(parsedProducts);
        if (!silent) triggerToast(`Catálogo importado correctamente de la pestaña "inventario": ${parsedProducts.length} artículos actualizados.`, 'success');
        return true;
      } else {
        throw new Error('No se detectaron filas útiles de datos en la pestaña "inventario".');
      }
    } catch (err: any) {
      console.warn('Error fetching CSV:', err);
      if (!silent) {
        triggerToast(
          `No se pudo sincronizar de entrada: ${err.message || 'Error de CORS o conexión'}. Usando base local.`,
          'info'
        );
      }
      return false;
    }
  };

  // Download sales database directly from CSV
  const downloadSalesFromGoogleSheets = async (silent = false) => {
    if (!silent) triggerToast('Consultando historial de ventas en Google Sheets...', 'info');
    const sheetId = extractSheetId(googleSheetUrl);
    if (!sheetId) {
      if (!silent) triggerToast('La URL de Google Sheet ingresada no es válida', 'error');
      return false;
    }

    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=ventas`;

    try {
      const controller = new AbortController();
      const idTimeout = setTimeout(() => controller.abort(), 8000); // 8 sec limit

      const response = await fetch(csvExportUrl, { signal: controller.signal });
      clearTimeout(idTimeout);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const csvData = await response.text();
      if (!csvData || csvData.includes('<!DOCTYPE html')) {
        throw new Error('La respuesta recibida no parece ser un archivo CSV válido. Verifica que la pestaña se llame "ventas" y que el Google Sheet tenga los permisos para ser leído por cualquier persona con el enlace.');
      }

      const parsedSales = parseCsvToSales(csvData);
      if (parsedSales && parsedSales.length > 0) {
        // Sort from newest (most actual) to oldest
        parsedSales.sort((a, b) => b.timestamp - a.timestamp);
        saveSalesToStorage(parsedSales);
        if (!silent) triggerToast(`Historial de ventas importado de la pestaña "ventas": ${parsedSales.length} transacciones actualizadas.`, 'success');
        return true;
      } else {
        throw new Error('No se detectaron filas útiles de datos en la pestaña "ventas".');
      }
    } catch (err: any) {
      console.warn('Error fetching Sales CSV:', err);
      if (!silent) {
        triggerToast(
          `No se pudo sincronizar las ventas de entrada: ${err.message || 'Error de CORS o conexión'}. Usando base local.`,
          'info'
        );
      }
      return false;
    }
  };

  // Combined master downloader that triggers both inventories and sales
  const downloadDatabaseFromGoogleSheets = async (silent = false) => {
    if (!silent) triggerToast('Iniciando sincronización completa de entrada...', 'info');

    const inventoryResult = await downloadFromGoogleSheets(true);
    const salesResult = await downloadSalesFromGoogleSheets(true);

    if (!silent) {
      if (inventoryResult && salesResult) {
        triggerToast('¡Sincronización completa con Google Sheets exitosa! Se han actualizado el Inventario y las Ventas con precisión. 🚀', 'success');
      } else if (inventoryResult) {
        triggerToast('Inventario actualizado. No se pudo cargar el historial de ventas del documento. ⚠️', 'info');
      } else if (salesResult) {
        triggerToast('Historial de ventas actualizado. No se pudo cargar el inventario del documento. ⚠️', 'info');
      } else {
        triggerToast('No se pudo establecer sincronización con ninguna pestaña de Google Sheets. Usando datos almacenados localmente.', 'error');
      }
    }
    return inventoryResult || salesResult;
  };

  // Internal highly robust CSV parse helper for Sales records
  const parseCsvToSales = (csvString: string): Sale[] => {
    if (!csvString || !csvString.trim()) return [];

    const lines = csvString.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length <= 1) return [];

    // Detect separator (comma, semicolon, or tab)
    const firstLine = lines[0];
    let separator = ',';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    if (semicolonCount > commaCount && semicolonCount > tabCount) {
      separator = ';';
    } else if (tabCount > commaCount && tabCount > semicolonCount) {
      separator = '\t';
    }

    // Splits a CSV row respecting double quotes
    const splitCSVLine = (line: string, sep: string): string[] => {
      const result: string[] = [];
      let currentIdx = 0;
      let inQuotes = false;
      let currentVal = '';

      while (currentIdx < line.length) {
        const char = line[currentIdx];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === sep && !inQuotes) {
          result.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
        currentIdx++;
      }
      result.push(currentVal.trim());
      return result;
    };

    const headerRow = splitCSVLine(lines[0], separator);
    let idIdx = -1;
    let dateIdx = -1;
    let timeIdx = -1;
    let amountIdx = -1;
    let profitIdx = -1;
    let sellerIdx = -1;
    let itemsIdx = -1;

    headerRow.forEach((col, idx) => {
      const cleanCol = col.toLowerCase().trim();
      
      if (cleanCol.includes('ganancia') || cleanCol.includes('profit') || cleanCol.includes('rentabilidad') || cleanCol.includes('margen')) {
        profitIdx = idx;
      } else if (cleanCol === 'id venta' || cleanCol === 'id_venta' || cleanCol === 'idventa' || cleanCol === 'id' || cleanCol.startsWith('id ')) {
        idIdx = idx;
      } else if (cleanCol.includes('fecha') || cleanCol.includes('date') || cleanCol === 'f') {
        dateIdx = idx;
      } else if (cleanCol.includes('hora') || cleanCol.includes('time') || cleanCol === 'h') {
        timeIdx = idx;
      } else if (cleanCol.includes('monto') || cleanCol.includes('total') || cleanCol.includes('amount') || cleanCol.includes('valor')) {
        amountIdx = idx;
      } else if (cleanCol.includes('vendedor') || cleanCol.includes('seller') || cleanCol.includes('cajero')) {
        sellerIdx = idx;
      } else if (cleanCol.includes('articulo') || cleanCol.includes('artículo') || cleanCol.includes('items') || cleanCol.includes('productos') || cleanCol.includes('detalle')) {
        itemsIdx = idx;
      }
    });

    // Fallbacks
    if (idIdx === -1) idIdx = 0;
    if (dateIdx === -1) dateIdx = 1;
    if (amountIdx === -1) amountIdx = 4;
    if (profitIdx === -1) profitIdx = 5;

    const newList: Sale[] = [];
    
    // Helper to parse double or generic decimals
    const parseDecimalValue = (valStr: string): number => {
      if (!valStr) return 0;
      let clean = valStr.replace('$', '').trim();
      
      if (clean.includes(',') && clean.includes('.')) {
        if (clean.indexOf('.') < clean.indexOf(',')) {
          clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
          clean = clean.replace(/,/g, '');
        }
      } else if (clean.includes(',')) {
        if ((clean.match(/,/g) || []).length === 1) {
          clean = clean.replace(',', '.');
        } else {
          clean = clean.replace(/,/g, '');
        }
      }
      return parseFloat(clean) || 0;
    };

    for (let i = 1; i < lines.length; i++) {
      const columns = splitCSVLine(lines[i], separator);
      if (columns.length <= Math.max(idIdx, dateIdx)) continue;

      const idRaw = columns[idIdx] || '';
      const dateStrRaw = dateIdx !== -1 && dateIdx < columns.length ? columns[dateIdx] : '';
      const dateStr = dateStrRaw.replace(/["']/g, '').trim();

      // Skip header row if it is read as data
      const idStrLower = idRaw.toLowerCase().trim();
      if (
        idStrLower.includes('id venta') || 
        idStrLower.includes('id_venta') || 
        idStrLower.includes('idventa') || 
        dateStr.toLowerCase().includes('fecha') ||
        idStrLower === 'id' ||
        idStrLower === 'id de venta'
      ) {
        continue;
      }

      const idClean = idRaw.replace(/["#]/g, '').trim();
      const sellerStrRaw = sellerIdx !== -1 && sellerIdx < columns.length ? columns[sellerIdx] : 'Importado';
      const sellerStr = sellerStrRaw.replace(/["']/g, '').trim();
      const saleId = idClean.includes(' - ') ? idClean : (idClean ? `${idClean} - ${sellerStr}` : `${10000 + i} - ${sellerStr}`);

      const timeStrRaw = timeIdx !== -1 && timeIdx < columns.length ? columns[timeIdx] : '12:00:00';
      const timeStr = timeStrRaw.replace(/["']/g, '').trim();

      // Parse timestamp format "YYYY-MM-DD" or "DD/MM/YYYY" plus time "HH:MM(:SS)" robustly
      let timestamp = Date.now();
      if (dateStr) {
        let cleanDate = dateStr;
        let cleanTime = timeStr;

        // Convert DD/MM/YYYY or YYYY-MM-DD / DD-MM-YYYY
        let year = 2026, month = 0, day = 1;
        const dParts = cleanDate.split('/');
        const dPartsHyphen = cleanDate.split('-');
        if (dParts.length === 3) {
          day = parseInt(dParts[0], 10);
          month = parseInt(dParts[1], 10) - 1; // 0-indexed
          year = parseInt(dParts[2], 10);
          if (year < 100) year += 2000;
        } else if (dPartsHyphen.length === 3) {
          if (dPartsHyphen[0].length === 4) {
            year = parseInt(dPartsHyphen[0], 10);
            month = parseInt(dPartsHyphen[1], 10) - 1;
            day = parseInt(dPartsHyphen[2], 10);
          } else {
            day = parseInt(dPartsHyphen[0], 10);
            month = parseInt(dPartsHyphen[1], 10) - 1;
            year = parseInt(dPartsHyphen[2], 10);
            if (year < 100) year += 2000;
          }
        }

        // Helper to parse localized time formats
        const parseTimeString = (tStr: string) => {
          let str = tStr.toLowerCase().trim();
          let isPM = false;
          let isAM = false;
          if (str.includes('p') || str.includes('t')) { // PM or p.m. or pm or tarde
            isPM = true;
          } else if (str.includes('a') || str.includes('m')) { // AM or a.m. or am or mañana
            isAM = true;
          }
          // Strip everything except digits, colons, and dots
          str = str.replace(/[^0-9:.]/g, '').trim();
          // Split by colons or dots
          const parts = str.split(/[:.]/);
          if (parts.length >= 2) {
            let hrs = parseInt(parts[0], 10);
            let mins = parseInt(parts[1], 10);
            let secs = parts.length > 2 ? parseInt(parts[2], 10) : 0;
            if (isNaN(hrs) || isNaN(mins)) return null;
            if (isNaN(secs)) secs = 0;

            if (isPM && hrs < 12) hrs += 12;
            if (isPM && hrs === 12) hrs = 12; // PM at 12 is 12
            if (isAM && hrs === 12) hrs = 0;

            return { hrs, mins, secs };
          }
          return null;
        };

        const tParsed = parseTimeString(cleanTime);
        if (tParsed) {
          // Build local Date object to avoid TZ shift
          const localD = new Date(year, month, day, tParsed.hrs, tParsed.mins, tParsed.secs, 0);
          timestamp = localD.getTime();
        } else {
          // fallback to date only (using local noon to avoid timezone shift)
          const localD = new Date(year, month, day, 12, 0, 0, 0);
          timestamp = localD.getTime();
        }
      } else {
        timestamp = Date.now() - i * 60000;
      }

      const totalAmount = amountIdx !== -1 && amountIdx < columns.length ? parseDecimalValue(columns[amountIdx]) : 0;
      const totalProfit = profitIdx !== -1 && profitIdx < columns.length ? parseDecimalValue(columns[profitIdx]) : 0;
      
      // Parse detailed items list if present
      let itemsList: { productName: string; quantity: number; sellingPrice: number }[] = [];
      if (itemsIdx !== -1 && itemsIdx < columns.length && columns[itemsIdx]) {
        const rawItems = columns[itemsIdx].trim();
        if (rawItems) {
          const itemsSplit = rawItems.split(/[,;•]/).map(x => x.trim()).filter(x => x.length > 0);
          itemsSplit.forEach(itemStr => {
            const matchX = itemStr.match(/^(\d+)\s*[xX]\s*(.+)$/);
            if (matchX) {
              const qty = parseInt(matchX[1]) || 1;
              const prodName = matchX[2].trim();
              itemsList.push({ productName: prodName, quantity: qty, sellingPrice: 0 });
            } else {
              const matchParentheses = itemStr.match(/^(.+)\s*\((\d+)\)$/);
              if (matchParentheses) {
                const prodName = matchParentheses[1].trim();
                const qty = parseInt(matchParentheses[2]) || 1;
                itemsList.push({ productName: prodName, quantity: qty, sellingPrice: 0 });
              } else {
                const matchNumStart = itemStr.match(/^(\d+)\s+(.+)$/);
                if (matchNumStart) {
                  const qty = parseInt(matchNumStart[1]) || 1;
                  const prodName = matchNumStart[2].trim();
                  itemsList.push({ productName: prodName, quantity: qty, sellingPrice: 0 });
                } else {
                  itemsList.push({ productName: itemStr, quantity: 1, sellingPrice: 0 });
                }
              }
            }
          });
        }
      }

      newList.push({
        id: saleId,
        timestamp,
        sellerName: sellerStr,
        totalAmount,
        totalProfit,
        items: itemsList
      });
    }

    return newList;
  };

  // Internal highly robust CSV/TSV parse helper
  const parseCsvToProducts = (csvString: string): Product[] => {
    if (!csvString || !csvString.trim()) return [];

    const lines = csvString.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length <= 1) return [];

    // Detect separator (comma, semicolon, or tab)
    const firstLine = lines[0];
    let separator = ',';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    if (semicolonCount > commaCount && semicolonCount > tabCount) {
      separator = ';';
    } else if (tabCount > commaCount && tabCount > semicolonCount) {
      separator = '\t';
    }

    // Splits a CSV row respecting double quotes
    const splitCSVLine = (line: string, sep: string): string[] => {
      const result: string[] = [];
      let currentIdx = 0;
      let inQuotes = false;
      let currentVal = '';

      while (currentIdx < line.length) {
        const char = line[currentIdx];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === sep && !inQuotes) {
          result.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
        currentIdx++;
      }
      result.push(currentVal.trim());
      return result;
    };

    const headerRow = splitCSVLine(lines[0], separator);
    let barcodeIdx = -1;
    let nameIdx = -1;
    let costIdx = -1;
    let sellingIdx = -1;
    let stockIdx = -1;
    let catIdx = -1;
    let unitIdx = -1;

    headerRow.forEach((col, idx) => {
      const cleanCol = col.toLowerCase().trim();
      if (cleanCol.includes('código') || cleanCol.includes('codigo') || cleanCol.includes('barcode') || cleanCol.includes('barra')) {
        barcodeIdx = idx;
      } else if (cleanCol.includes('nombre') || cleanCol.includes('name') || cleanCol.includes('articulo') || cleanCol.includes('artículo') || cleanCol === 'producto') {
        nameIdx = idx;
      } else if (cleanCol.includes('costo') || cleanCol.includes('cost') || cleanCol.includes('compra') || cleanCol.includes('p. costo') || cleanCol.includes('p.costo')) {
        costIdx = idx;
      } else if (cleanCol.includes('venta') || cleanCol.includes('price') || cleanCol.includes('p. venta') || cleanCol.includes('p.venta')) {
        sellingIdx = idx;
      } else if (cleanCol.includes('stock') || cleanCol.includes('inventario') || cleanCol.includes('cantidad') || cleanCol.includes('cant') || cleanCol === 'existencias') {
        stockIdx = idx;
      } else if (cleanCol.includes('categoría') || cleanCol.includes('categoria') || cleanCol.includes('category')) {
        catIdx = idx;
      } else if (cleanCol.includes('unidad') || cleanCol.includes('unit')) {
        unitIdx = idx;
      }
    });

    if (nameIdx === -1) nameIdx = 0;

    const newList: Product[] = [];
    let loopId = 1;

    for (let i = 1; i < lines.length; i++) {
      const columns = splitCSVLine(lines[i], separator);
      if (columns.length <= nameIdx) continue;

      const name = columns[nameIdx];
      if (!name) continue;

      const barcode = barcodeIdx !== -1 && barcodeIdx < columns.length && columns[barcodeIdx] ? columns[barcodeIdx] : null;

      // Utility to parse potentially formatted decimal numbers (e.g. European/Latin format: "120,50" or "1.500,00")
      const parseValue = (valStr: string): number => {
        if (!valStr) return 0;
        let clean = valStr.replace('$', '').trim();
        
        if (clean.includes(',') && clean.includes('.')) {
          if (clean.indexOf('.') < clean.indexOf(',')) {
            // Dot is thousand separators, comma is decimal point
            clean = clean.replace(/\./g, '').replace(',', '.');
          } else {
            // Comma is thousand separators, dot is decimal point
            clean = clean.replace(/,/g, '');
          }
        } else if (clean.includes(',')) {
          // If there is only one comma, it is probably the decimal point
          if ((clean.match(/,/g) || []).length === 1) {
            clean = clean.replace(',', '.');
          } else {
            clean = clean.replace(/,/g, '');
          }
        }
        return parseFloat(clean) || 0;
      };

      const costPrice = costIdx !== -1 && costIdx < columns.length ? parseValue(columns[costIdx]) : 0;
      const sellingPrice = sellingIdx !== -1 && sellingIdx < columns.length ? parseValue(columns[sellingIdx]) : 0;
      const stock = stockIdx !== -1 && stockIdx < columns.length ? parseValue(columns[stockIdx]) : 0;
      const category = catIdx !== -1 && catIdx < columns.length && columns[catIdx] ? columns[catIdx] : 'Alimentos';
      const unit = unitIdx !== -1 && unitIdx < columns.length && columns[unitIdx] ? columns[unitIdx] : 'unidades';

      newList.push({
        id: loopId++,
        name,
        barcode,
        costPrice,
        sellingPrice,
        stock,
        unit,
        category
      });
    }

    return newList;
  };

  // Upload sales entries and updated inventories to the Google Script Web App
  const uploadToGoogleSheets = async (currentProducts: Product[], currentSales: Sale[]): Promise<{ success: boolean; msg: string }> => {
    if (!appsScriptUrl || !appsScriptUrl.startsWith('http')) {
      return { success: false, msg: 'URL de Apps Script desconfigurada o incorrecta.' };
    }

    // Map internal items to Apps Script matrices
    const inventarioArray: any[][] = [
      ["Nombre", "Código de barras", "Precio venta", "Precio costo", "Stock", "Unidad", "Categoría", "Proveedor"]
    ];

    currentProducts.forEach(p => {
      inventarioArray.push([
        p.name,
        p.barcode || '',
        p.sellingPrice,
        p.costPrice,
        p.stock,
        p.unit,
        p.category,
        ""
      ]);
    });

    const ventasArray: any[][] = [
      ["ID Venta", "Fecha", "Hora", "Vendedor", "Monto Total", "Ganancia Total"]
    ];

    currentSales.forEach(s => {
      const dObj = new Date(s.timestamp);
      
      const year = dObj.getFullYear();
      const month = String(dObj.getMonth() + 1).padStart(2, '0');
      const day = String(dObj.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const hours = String(dObj.getHours()).padStart(2, '0');
      const minutes = String(dObj.getMinutes()).padStart(2, '0');
      const seconds = String(dObj.getSeconds()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}:${seconds}`;

      ventasArray.push([
        s.id.toString().includes(' - ') ? s.id : `${s.id} - ${s.sellerName}`,
        dateStr,
        timeStr,
        s.sellerName,
        s.totalAmount,
        s.totalProfit
      ]);
    });

    const payload = {
      action: "sync",
      inventario: inventarioArray,
      ventas: ventasArray
    };

    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Common pattern for direct Google Sheets form macros in iframe
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Since mode is no-cors, response we get is opaque but we can assume success if the request executes without network error.
      return { success: true, msg: 'Datos enviados a Google Sheets. Proceso de sincronización asincrónico finalizado.' };

    } catch (e: any) {
      console.error(e);
      return { success: false, msg: e.message || 'Error de red al sincronizar con el Apps Script' };
    }
  };

  // Master Checkout Action handler
  const processCheckout = async () => {
    if (cart.length === 0) return;

    triggerToast('Validando existencias en la nube (Google Sheets)...', 'info');

    // 1. Preliminar check - download updated stock from sheet (mimicking original code sequence)
    try {
      await downloadFromGoogleSheets(true);
    } catch (e) {
      console.log('Fallo descarga preliminar, continuando con stock local.');
    }

    // 2. Local stock validation
    let failedValidation = false;
    const validatedProducts = [...products];

    for (const item of cart) {
      const freshProd = validatedProducts.find(p => p.id === item.product.id);
      if (!freshProd || freshProd.stock < item.quantity) {
        triggerToast(
          `Error de Stock: ${item.product.name} dispone de ${freshProd?.stock || 0} unidades en almacén. Modifica el carrito.`, 
          'error'
        );
        failedValidation = true;
        break;
      }
    }

    if (failedValidation) return;

    // 3. Subtract stock and build checkout rows
    cart.forEach(item => {
      const target = validatedProducts.find(p => p.id === item.product.id);
      if (target) {
        target.stock -= item.quantity;
      }
    });

    const numericSalesIds = sales
      .map(s => {
        if (typeof s.id === 'number') return s.id;
        const sStr = String(s.id);
        const firstPart = sStr.split(' - ')[0]; // Isolate the sequential ID prefix
        const cleanDigits = firstPart.replace(/\D/g, '');
        return parseInt(cleanDigits, 10);
      })
      .filter(id => !isNaN(id));
    const nextSaleId = numericSalesIds.length > 0 ? Math.max(...numericSalesIds) + 1 : 10001;
    const itemsRef = cart.map(item => ({
      productName: item.product.name,
      quantity: item.quantity,
      sellingPrice: item.product.sellingPrice
    }));

    const nextSale: Sale = {
      id: nextSaleId,
      timestamp: Date.now(),
      sellerName: selectedSeller.trim() || 'Admin Principal',
      totalAmount: cartStatistics.totalPrice,
      totalProfit: cartStatistics.totalProfit,
      items: itemsRef
    };

    const updatedSales = [nextSale, ...sales];

    // Local DB save
    saveProductsToStorage(validatedProducts);
    saveSalesToStorage(updatedSales);

    // Reset checkout states
    setCart([]);
    setReceivedCash('');
    setIsCartExpanded(false);
    triggerToast('Venta registrada con éxito de manera local ✅', 'success');

    // 4. Remote Sync (mimicking original code in background)
    triggerToast('Estableciendo conexión y subiendo actualización al servidor central...', 'info');
    const syncRes = await uploadToGoogleSheets(validatedProducts, updatedSales);
    if (syncRes.success) {
      triggerToast('Sincronizados stocks y transacciones en la nube (Google Sheets) 🚀', 'success');
    } else {
      triggerToast(`Venta guardada. Error al alcanzar Google Sheet: ${syncRes.msg}`, 'error');
    }
  };

  // Product crud operation handlers
  const openNewProductForm = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBarcode('');
    setFormCost(0);
    setFormSelling(0);
    setFormStock(0);
    setFormUnit('unidades');
    setFormCategory('Alimentos');
    setIsModalOpen(true);
  };

  const openEditProductForm = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormBarcode(product.barcode || '');
    setFormCost(product.costPrice);
    setFormSelling(product.sellingPrice);
    setFormStock(product.stock);
    setFormUnit(product.unit);
    setFormCategory(product.category);
    setIsModalOpen(true);
  };

  const deleteProduct = (id: number) => {
    const target = products.find(p => p.id === id);
    if (!target) return;

    if (window.confirm(`¿Está seguro de que desea eliminar permanentemente el artículo "${target.name}"?`)) {
      const updated = products.filter(p => p.id !== id);
      saveProductsToStorage(updated);
      triggerToast('Artículo removido del catálogo de inventario', 'success');
    }
  };

  const saveProductForm = (e: FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name) {
      triggerToast('El nombre del artículo es obligatorio.', 'error');
      return;
    }

    if (editingProduct) {
      // Edit
      const updated = products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name,
            barcode: formBarcode.trim() || null,
            costPrice: Number(formCost) || 0,
            sellingPrice: Number(formSelling) || 0,
            stock: Number(formStock) || 0,
            unit: formUnit,
            category: formCategory.trim() || 'Alimentos'
          };
        }
        return p;
      });
      saveProductsToStorage(updated);
      triggerToast(`Modificado correctamente: ${name}`, 'success');
    } else {
      // Create new
      const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      const newProd: Product = {
        id: nextId,
        name,
        barcode: formBarcode.trim() || null,
        costPrice: Number(formCost) || 0,
        sellingPrice: Number(formSelling) || 0,
        stock: Number(formStock) || 0,
        unit: formUnit,
        category: formCategory.trim() || 'Alimentos'
      };
      saveProductsToStorage([...products, newProd]);
      triggerToast(`Ficha creada: ${name}`, 'success');
    }

    setIsModalOpen(false);
  };



  return (
    <div className="bg-slate-50 text-slate-800 min-h-screen flex flex-col font-sans selection:bg-teal-700 selection:text-white" id="dinamica-app-root">
      
      {/* HEADER BAR - Premium dark corporate design */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-50 transition-all duration-300" id="main-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl border border-teal-500/30 bg-gradient-to-tr from-teal-800 to-teal-600 text-white font-bold text-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
              D
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white">DINAMICA</h1>
              </div>
              <p className="text-xs text-slate-400 tracking-wide font-medium uppercase mt-0.5">Control de Alimentos y Bebidas</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isEditingUser ? (
              <div className="flex items-center bg-slate-800 border border-teal-500 rounded-lg px-2.5 py-1 text-xs text-white">
                <User className="w-3.5 h-3.5 text-teal-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={selectedSeller}
                  onChange={(e) => setSelectedSeller(e.target.value)}
                  onBlur={() => setIsEditingUser(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingUser(false);
                  }}
                  autoFocus
                  className="bg-transparent border-none text-white focus:outline-none w-24 sm:w-32 font-bold focus:ring-0 p-0 text-xs"
                />
              </div>
            ) : (
              <button
                onClick={() => setIsEditingUser(true)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 border border-slate-700/85 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs text-white font-bold transition-all shadow-sm cursor-pointer"
                title="Cambiar vendedor"
              >
                <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[150px]">{selectedSeller || 'Escribir usuario'}</span>
                <span className="text-[10px] text-teal-400 font-normal ml-0.5">✎</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BODY WORKSPACE */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-6 flex flex-col lg:flex-row gap-8">
        
        {/* REFINED FLOATING NAVIGATION PANEL */}
        <nav className="grid grid-cols-4 lg:flex lg:flex-col gap-1 sm:gap-1.5 bg-white p-1.5 sm:p-2.5 rounded-2xl border border-slate-200/60 shadow-sm lg:w-72 flex-shrink-0 self-start sticky top-[73px] lg:top-24 z-30 w-full" id="main-navigation">
          <div className="hidden lg:block px-4 py-3.5 border-b border-slate-100 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navegación</span>
          </div>

          <button 
            type="button"
            id="tab-btn-pos"
            onClick={() => setActiveTab('pos')} 
            className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 py-2 sm:px-3 sm:py-2.5 lg:px-4 lg:py-3 rounded-xl text-[11px] sm:text-xs lg:text-sm font-bold transition-all duration-200 cursor-pointer lg:w-full ${
              activeTab === 'pos' 
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 h-5 shrink-0" />
            <span className="truncate">Venta</span>
            <span className={`hidden lg:inline-block text-[11px] px-1.5 py-0.5 rounded font-mono ml-auto ${activeTab === 'pos' ? 'bg-teal-850 text-teal-200' : 'bg-slate-100 text-slate-500'}`}>F1</span>
          </button>

          <button 
            type="button"
            id="tab-btn-inventory"
            onClick={() => setActiveTab('inventory')} 
            className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 py-2 sm:px-3 sm:py-2.5 lg:px-4 lg:py-3 rounded-xl text-[11px] sm:text-xs lg:text-sm font-bold transition-all duration-200 cursor-pointer lg:w-full ${
              activeTab === 'inventory' 
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Warehouse className="w-4 h-4 sm:w-5 h-5 shrink-0" />
            <span className="truncate">Stock</span>
            <span className={`text-[9px] sm:text-xs px-1.5 py-0.5 rounded-full font-mono lg:ml-auto ${activeTab === 'inventory' ? 'bg-teal-800 text-teal-200' : 'bg-slate-100 text-slate-500'}`}>
              {products.length}
            </span>
          </button>

          <button 
            type="button"
            id="tab-btn-sales"
            onClick={() => setActiveTab('sales')} 
            className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 py-2 sm:px-3 sm:py-2.5 lg:px-4 lg:py-3 rounded-xl text-[11px] sm:text-xs lg:text-sm font-bold transition-all duration-200 cursor-pointer lg:w-full ${
              activeTab === 'sales' 
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 sm:w-5 h-5 shrink-0" />
            <span className="truncate">Historia</span>
            <span className={`text-[9px] sm:text-xs px-1.5 py-0.5 rounded-full font-mono lg:ml-auto ${activeTab === 'sales' ? 'bg-teal-800 text-teal-200' : 'bg-slate-100 text-slate-500'}`}>
              {sales.length}
            </span>
          </button>

          <button 
            type="button"
            id="tab-btn-sync"
            onClick={() => setActiveTab('sync')} 
            className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 py-2 sm:px-3 sm:py-2.5 lg:px-4 lg:py-3 rounded-xl text-[11px] sm:text-xs lg:text-sm font-bold transition-all duration-200 cursor-pointer lg:w-full ${
              activeTab === 'sync' 
                ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4 sm:w-5 h-5 shrink-0 animate-infinite" />
            <span className="truncate">Sync</span>
          </button>

          <div className="hidden lg:block mt-8 pt-4 border-t border-slate-100 px-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Resumen Financiero</span>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Ingresos Totales:</span>
                <span className="font-semibold text-slate-700">${financialStats.revenue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Ganancia Neta:</span>
                <span className="font-semibold text-emerald-600">${financialStats.profit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </nav>

        {/* WORKSPACE SHEETS VIEWPORT */}
        <section className="flex-grow flex flex-col min-w-0" id="content-viewport">
          
          {/* TOAST SYSTEM ALERTS */}
          {toast && (
            <div 
              id="toast-notification-banner"
              className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center justify-between border shadow-lg transform scale-100 transition duration-300 ${
                toast.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : toast.type === 'error' 
                    ? 'bg-rose-50 text-rose-800 border-rose-200' 
                    : 'bg-teal-50 text-teal-800 border-teal-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-teal-500 animate-pulse" />}
                <span>{toast.text}</span>
              </div>
              <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ==================== SCREEN: PUNTO DE VENTA (POS) ==================== */}
          {activeTab === 'pos' && (
            <div className="flex flex-col gap-8 pb-20 animate-fade-in" id="viewport-pos">
              
              {/* Product selection grid */}
              <div className="flex-grow bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col min-h-[500px]">
                
                {/* Fixed/immobile Search query box & Filter categorized pill scroll */}
                <div className="sticky top-[152px] lg:top-24 bg-white z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 -mt-6 -mx-6 pt-6 px-6 pb-4 mb-6 border-b border-slate-100 rounded-t-2xl shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                  <div className="relative flex-grow max-w-lg">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                    <input 
                      type="text" 
                      id="input-pos-search"
                      value={posSearchQuery}
                      onChange={(e) => setPosSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, código de barras..." 
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-sm placeholder:text-slate-400 bg-slate-50/50"
                    />
                    {posSearchQuery && (
                      <button 
                        onClick={() => setPosSearchQuery('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  {/* Filter category pills */}
                  <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
                    {categoriesList.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPosSelectedCategory(cat)}
                        className={`text-xs px-3.5 py-1.5 rounded-full font-semibold border transition-all pointer cursor-pointer ${
                          posSelectedCategory === cat
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat === 'all' ? 'Todos' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main responsive grid columns layout */}
                {filteredPOSProducts.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center py-12 text-slate-400">
                    <AlertCircle className="w-10 h-10 text-slate-300 mb-2.5" />
                    <p className="text-sm">No se encontraron artículos que coincidan con la búsqueda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="pos-products-grid">
                    {filteredPOSProducts.map(p => {
                      const isLow = p.stock <= 5 && p.stock > 0;
                      const isOutOfStock = p.stock <= 0;

                      return (
                        <div 
                          key={p.id}
                          onClick={() => !isOutOfStock && addToCart(p)}
                          className={`p-4 rounded-xl border flex flex-col justify-between hover:border-teal-600 hover:shadow-md transition-all duration-150 cursor-pointer group ${
                            isOutOfStock 
                              ? 'opacity-55 bg-slate-50 border-slate-200 cursor-not-allowed' 
                              : 'bg-white border-slate-200 shadow-sm'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5 mb-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{p.category}</span>
                              {isOutOfStock ? (
                                <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded">Agotado</span>
                              ) : isLow ? (
                                <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Stock Bajo ({p.stock})</span>
                              ) : (
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{p.stock} pzas</span>
                              )}
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-teal-900 transition-colors line-clamp-2">{p.name}</h3>
                            <p className="text-[11px] text-slate-400 font-mono mt-1">{p.barcode || 'Sin SKU / Código'}</p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-4">
                            <span className="text-base font-extrabold text-slate-900">
                              ${p.sellingPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                            <button
                              disabled={isOutOfStock}
                              className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                isOutOfStock 
                                  ? 'bg-slate-100 text-slate-400' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-teal-700 hover:text-white'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Sumar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 🛒 STICKY / PERSISTENT BOTTOM BAR AND DRAWER SHEET FOR POS */}
              <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
                {/* Backdrop Layer */}
                {isCartExpanded && (
                  <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300"
                    onClick={() => setIsCartExpanded(false)}
                  />
                )}

                {/* Bottom Drawer Sheet */}
                <div 
                  className={`w-full max-w-4xl mx-auto bg-white rounded-t-3xl border-t border-slate-200/95 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] pointer-events-auto transition-all duration-300 ${
                    isCartExpanded ? 'translate-y-0 max-h-[85vh] md:max-h-[580px] h-full flex flex-col' : 'translate-y-0 h-16 flex flex-col overflow-hidden'
                  }`}
                >
                  {/* Sticky Header Row */}
                  <div 
                    onClick={() => setIsCartExpanded(!isCartExpanded)}
                    className={`flex items-center justify-between px-4 sm:px-6 h-16 min-h-16 cursor-pointer select-none transition-colors duration-200 ${
                      isCartExpanded ? 'bg-teal-850 text-white rounded-t-2xl border-b border-teal-950' : 'bg-teal-700 text-white hover:bg-teal-800 rounded-t-2xl shadow-lg'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <ShoppingCart className="w-5 h-5 shrink-0" />
                        {cart.length > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                            {cart.reduce((acc, item) => acc + item.quantity, 0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-black tracking-wide uppercase">Carrito de Ventas</span>
                        {cart.length > 0 && (
                          <span className="hidden sm:inline text-xs opacity-90 ml-3 font-semibold bg-teal-800 px-2 py-0.5 rounded-full">
                            {cart.length} {cart.length === 1 ? 'artículo' : 'artículos distintos'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Monto Total:</span>
                        <span className="text-base sm:text-xl font-extrabold font-mono">
                          ${cartStatistics.totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="bg-white/10 p-1 rounded-lg shrink-0">
                        {isCartExpanded ? (
                          <ChevronDown className="w-4 h-4 text-white" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-white animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Drawer Content Body */}
                  {isCartExpanded && (
                    <div className="flex-grow p-4 sm:p-6 flex flex-col md:flex-row gap-5 overflow-hidden bg-slate-50">
                      {/* Left Side: Cart Items List */}
                      <div className="flex-grow flex flex-col bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-sm min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
                          <h3 className="font-bold text-slate-800 text-xs tracking-wide uppercase flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-teal-700" />
                            <span>Productos Seleccionados</span>
                          </h3>
                          <button 
                            onClick={clearCart}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer disabled:opacity-40"
                            disabled={cart.length === 0}
                          >
                            Vaciar Carrito
                          </button>
                        </div>

                        {/* Scroll List container */}
                        <div className="flex-grow overflow-y-auto pr-1 space-y-2.5 min-h-0">
                          {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                                <ShoppingCart className="w-5 h-5 text-slate-300" />
                              </div>
                              <p className="text-xs">Usa el panel de arriba para sumar artículos al carrito.</p>
                            </div>
                          ) : (
                            cart.map(item => (
                              <div key={item.product.id} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-200/50 gap-2 hover:bg-slate-50 transition-colors">
                                <div className="min-w-0 flex-grow">
                                  <h4 className="text-xs font-bold text-slate-800 truncate">{item.product.name}</h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                    ${item.product.sellingPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })} c/u
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                  <div className="flex items-center border border-slate-200 bg-white rounded-lg overflow-hidden">
                                    <button 
                                      onClick={() => updateCartQty(item.product.id, -1)}
                                      className="px-2.5 py-1 text-xs font-black text-slate-500 hover:bg-slate-100 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="px-2 text-xs font-bold text-slate-800 min-w-4 text-center">{item.quantity}</span>
                                    <button 
                                      onClick={() => updateCartQty(item.product.id, 1)}
                                      className="px-2.5 py-1 text-xs font-black text-slate-500 hover:bg-slate-100 cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <button 
                                    onClick={() => removeFromCart(item.product.id)}
                                    className="p-1.5 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Right Side: Checkout controls */}
                      <div className="w-full md:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/70 shadow-sm flex flex-col justify-between h-full min-h-0">
                          <div>
                            <h3 className="font-bold text-slate-800 text-xs tracking-wide uppercase mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-teal-700" />
                              <span>Detalle del Cobro</span>
                            </h3>

                            {/* Payment details */}
                            <div className="mb-4">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recibido ($)</label>
                              <input 
                                type="number" 
                                placeholder="Monto"
                                value={receivedCash}
                                onChange={(e) => setReceivedCash(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-teal-500 font-bold"
                                disabled={cart.length === 0}
                              />
                            </div>

                            {/* Cambio calculation */}
                            {cart.length > 0 && receivedCash && (
                              <div className="mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200/50 text-xs">
                                <div className="flex justify-between items-center text-slate-600">
                                  <span>Monto recibido:</span>
                                  <span className="font-semibold">${parseFloat(receivedCash).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-emerald-700 font-bold mt-1">
                                  <span>De vuelto / Cambio:</span>
                                  <span>${calculatedChange.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            )}

                            <div className="flex justify-between items-baseline mb-4 pt-2 border-t border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Monto Final</span>
                              <span className="text-xl font-black text-teal-800 font-mono">
                                ${cartStatistics.totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={processCheckout}
                            disabled={cart.length === 0}
                            className="w-full bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition duration-150 shadow-md flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                          >
                            <CheckCircle className="w-4 h-4 shrink-0" />
                            <span>Registrar y Sincronizar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== SCREEN: CONTROL DE INVENTARIO ==================== */}
          {activeTab === 'inventory' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm animate-fade-in" id="viewport-inventory">
              
              {/* Heading toolbar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Control General de Artículos</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Gestión interna, precios de costo, existencias registradas y categorías</p>
                </div>
                
                <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
                  <div className="relative flex-grow md:flex-initial">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      value={inventorySearchQuery}
                      onChange={(e) => setInventorySearchQuery(e.target.value)}
                      placeholder="Buscar en catálogo..." 
                      className="pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 w-full focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={openNewProductForm}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2 rounded-xl text-xs transition duration-150 flex items-center justify-center gap-1.5 shadow-sm shrink-0 pointer cursor-pointer"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Nuevo Artículo</span>
                  </button>
                </div>
              </div>

              {/* Responsive Elegant Grid List */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="inventory-table">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3.5 px-4 font-bold">Artículo / SKU</th>
                      <th className="py-3.5 px-4 text-right font-bold">Costo Unit.</th>
                      <th className="py-3.5 px-4 text-right font-bold">Precio Venta</th>
                      <th className="py-3.5 px-4 text-center font-bold">Margen</th>
                      <th className="py-3.5 px-4 text-center font-bold">Stock Actual</th>
                      <th className="py-3.5 px-4 font-bold">Categoría</th>
                      <th className="py-3.5 px-4 text-center font-bold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventoryProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                          No hay artículos configurados en la base de datos o coincidentes con el filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredInventoryProducts.map(p => {
                        const isLow = p.stock <= 5;
                        const isOutOfStock = p.stock <= 0;
                        const profitMargin = p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0;
                        const displayMargin = parseFloat(profitMargin.toFixed(0));

                        let marginColorClass = "text-emerald-600";
                        if (displayMargin < 0) {
                          marginColorClass = "text-rose-500 font-bold bg-rose-50/50 px-1.5 py-0.5 rounded";
                        } else if (displayMargin === 0) {
                          marginColorClass = "text-amber-500 font-bold bg-amber-50/50 px-1.5 py-0.5 rounded";
                        }

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-700">
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 block">{p.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{p.barcode || 'Sin Código SKU'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                              ${p.costPrice.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-800">
                              ${p.sellingPrice.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`font-mono font-semibold text-xs ${marginColorClass}`}>
                                {displayMargin}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {isOutOfStock ? (
                                <span className="inline-block bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-bold">Sin Stock</span>
                              ) : isLow ? (
                                <span className="inline-block bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold">Bajo ({p.stock} {p.unit})</span>
                              ) : (
                                <span className="inline-block bg-teal-50 text-teal-800 px-2.5 py-1 rounded-full font-bold">{p.stock} {p.unit}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-medium">
                              {p.category}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openEditProductForm(p)}
                                  className="p-1.5 text-slate-400 hover:text-teal-700 rounded-lg hover:bg-slate-100 transition duration-150 cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteProduct(p.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition duration-150 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== SCREEN: VENTAS & REPORTES ==================== */}
          {activeTab === 'sales' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm animate-fade-in" id="viewport-sales">
              
              {/* Sales Header & Stat badges */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Historial de Ventas &amp; Transacciones</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Control de rentabilidad acumulada, márgenes y cobros</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-right min-w-32">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Facturado</span>
                    <span className="text-sm font-bold text-teal-800 font-mono">
                      ${financialStats.revenue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-right min-w-32">
                    <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Margen Ganancia</span>
                    <span className="text-sm font-extrabold text-emerald-600 font-mono">
                      ${financialStats.profit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sales transactions list table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="sales-history-table">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-3 px-2 sm:px-4 font-bold">ID Venta</th>
                      <th className="py-3 px-2 sm:px-4 text-right font-bold">Monto Total</th>
                      <th className="py-3 px-2 sm:px-4 text-right font-bold">Ganancia Neta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-400">
                          Aún no se han registrado transacciones de ventas el día de hoy.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        let isAlternate = false;
                        let prevDate = '';
                        return sales.map((s, idx) => {
                          const sDate = new Date(s.timestamp).toLocaleDateString('es-AR');
                          if (idx > 0 && sDate !== prevDate) {
                            isAlternate = !isAlternate;
                          }
                          prevDate = sDate;
                          const bgClass = isAlternate 
                            ? "bg-slate-100 hover:bg-slate-200/60 transition-colors" 
                            : "bg-white hover:bg-slate-50/80 transition-colors";

                          return (
                            <tr key={s.id} className={bgClass}>
                              <td className="py-3 px-2 sm:px-4">
                                <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                                  {s.id}
                                </div>
                                <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5 whitespace-nowrap">
                                  {sDate} - {(() => {
                                    const d = new Date(s.timestamp);
                                    const hrs = String(d.getHours()).padStart(2, '0');
                                    const mins = String(d.getMinutes()).padStart(2, '0');
                                    return `${hrs}:${mins} hs`;
                                  })()}
                                </div>
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-right font-mono font-bold text-teal-800 text-xs sm:text-sm whitespace-nowrap">
                                ${s.totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-2 sm:px-4 text-right font-mono font-extrabold text-emerald-600 text-xs sm:text-sm whitespace-nowrap">
                                ${s.totalProfit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== SCREEN: CONFIGURACION DE SINCRONIZACION ==================== */}
          {activeTab === 'sync' && (
            <div className="space-y-6 animate-fade-in" id="viewport-sync">
              
              {/* Google Sheets integration parameters panel */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="pb-4 mb-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Estrategia de Sincronización</h2>
                    <p className="text-xs text-slate-500 mt-0.5">El sistema está enlazado permanentemente al servidor de datos central de Google Sheets</p>
                  </div>
                  <Database className="w-5 h-5 text-teal-700 shrink-0" />
                </div>

                <div className="space-y-4">
                  {/* Import Configuration (Locked Single Google Sheet) */}
                  <div className="p-5 bg-teal-50/50 border border-teal-500/20 rounded-xl">
                    <span className="block text-[10px] font-bold text-teal-800 uppercase tracking-widest mb-2.5">Hoja de Cálculo Vinculada (Sincronización Activa)</span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <div className="min-w-0 flex-grow">
                        <span className="block text-sm font-bold text-slate-850 truncate font-mono">DINAMICA - Control de Inventario</span>
                        <span className="block text-[11px] text-slate-500 font-mono mt-0.5 truncate select-all">{googleSheetUrl}</span>
                      </div>
                      <a 
                        href={googleSheetUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 shrink-0 shadow-sm pointer cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        <span>Abrir Google Sheet</span>
                      </a>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      El sistema está conectado permanentemente en modo lectura/escritura a este documento para garantizar el control de existencias. Los permisos del documento están configurados para descargas directas en CSV.
                    </p>
                  </div>

                  {/* Apps Script Configuration (Locked Single Script) */}
                  <div className="p-5 bg-indigo-50/45 border border-indigo-500/15 rounded-xl">
                    <span className="block text-[10px] font-bold text-indigo-800 uppercase tracking-widest mb-2.5">Script de Sincronización (Macro Web App Activa)</span>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <div className="min-w-0">
                        <span className="block text-sm font-bold text-slate-850 truncate font-mono">Apps Script - Sincronizador Automático</span>
                        <span className="block text-[11.5px] text-slate-500 font-mono mt-1 break-all select-all">{appsScriptUrl}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                      Esta pasarela transaccional automatiza la reducción física de stocks y el registro analítico de ventas globales al instante en Google Sheets.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action tools testing panel */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Pruebas Manuales de Sincronización</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ejecuta manualmente el envío y recepción para forzar la actualización de los catálogos.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button 
                    onClick={() => downloadDatabaseFromGoogleSheets(false)} 
                    className="flex-1 md:flex-none justify-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-5 py-3 rounded-xl text-xs transition duration-150 flex items-center gap-1.5 cursor-pointer pointer border border-slate-200"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Recibir Actualización</span>
                  </button>
                  
                  <button 
                    onClick={async () => {
                      triggerToast('Iniciando sincronización manual...', 'info');
                      const res = await uploadToGoogleSheets(products, sales);
                      if (res.success) {
                        triggerToast('Ventas e Inventario sincronizados con Google Sheets correctamente 🚀', 'success');
                      } else {
                        triggerToast(`No se pudo sincronizar: ${res.msg}`, 'error');
                      }
                    }} 
                    className="flex-1 md:flex-none justify-center bg-teal-700 hover:bg-teal-800 text-white font-semibold px-5 py-3 rounded-xl text-xs transition duration-150 flex items-center gap-1.5 cursor-pointer pointer shadow-md"
                  >
                    <Upload className="w-4 h-4 text-white" />
                    <span>Enviar Inventario y Ventas</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </section>
      </main>

      {/* ==================== PRODUCT FORM DRAWER MODAL DIALOG ==================== */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" 
          id="product-editor-modal"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-wide uppercase">{editingProduct ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Escribe la información detallada del producto</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white rounded-lg p-1 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveProductForm} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Comercial *</label>
                <input 
                  type="text" 
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Gaseosa Sabor Original..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Código de barras SKU (Opcional)</label>
                <input 
                  type="text" 
                  value={formBarcode}
                  onChange={(e) => setFormBarcode(e.target.value)}
                  placeholder="77901234567..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">P. Costo Compra ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">P. Venta Público ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    value={formSelling}
                    onChange={(e) => setFormSelling(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-bold text-teal-850"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Stock Almacén</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Unidad Medida</label>
                  <select 
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                  >
                    <option value="unidades">unidades</option>
                    <option value="kg">kilogramos (kg)</option>
                    <option value="porciones">porciones</option>
                    <option value="botellas">botellas</option>
                    <option value="latas">latas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Categoría del Producto</label>
                <input 
                  type="text" 
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Alimentos, Bebidas..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl text-[10.5px] text-slate-500 leading-relaxed text-center">
                <span>* Los campos marcados son obligatorios para registrar existencias válidas. El stock inicial puede ser cero.</span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3.5">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-4 py-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition duration-150 cursor-pointer"
                >
                  Guardar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER BAR */}
      <footer className="bg-slate-900 text-slate-500 py-8 border-t border-slate-800 text-center text-xs mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-6 space-y-2">
          <p className="font-semibold text-slate-400">DINAMICA PWA &amp; Web Control Hub.</p>
          <p className="max-w-md mx-auto text-slate-500 text-[11px] leading-relaxed">
            Consola administrativa elegante de facturación local e inventarios optimizada con sincronización asincrónica para hojas de cálculo de Google.
          </p>
        </div>
      </footer>

    </div>
  );
}
