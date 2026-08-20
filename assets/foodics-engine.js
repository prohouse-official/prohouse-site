/**
 * محرك الربط مع فودكس (Foodics Ordering Middleware Engine)
 */
const FOODICS_CONFIG = {
  mode: 'mock',
  apiBaseUrl: 'https://api.foodics.com/v5',
  apiToken: 'FOODICS_API_TOKEN',
  branches: {
    'rawdah': { id: 'br_rawdah_001', name: 'فرع الروضة (صاري)', address: 'شارع صاري، حي الروضة' },
    'shatee': { id: 'br_shatee_002', name: 'فرع الشاطئ (الكورنيش)', address: 'طريق الكورنيش، حي الشاطئ' }
  },
  vatPercentage: 0.15
};

class FoodicsOrderingEngine {
  constructor(config = FOODICS_CONFIG) {
    this.config = config;
  }

  formatFoodicsPayload(cart, customer, orderType, branchKey) {
    const branch = this.config.branches[branchKey] || this.config.branches['rawdah'];
    let subtotal = 0;
    const products = cart.map(item => {
      const itemTotal = item.unitPrice * item.quantity;
      subtotal += itemTotal;
      return {
        product_id: item.foodicsId || 'prod_' + item.id,
        name: item.title,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: itemTotal,
        notes: item.notes || ''
      };
    });

    const taxAmount = +(subtotal * this.config.vatPercentage).toFixed(2);
    const total = +(subtotal + taxAmount).toFixed(2);

    return {
      branch_id: branch.id,
      branch_name: branch.name,
      type: orderType === 'delivery' ? 2 : 1,
      status: 1,
      notes: customer.notes || 'طلب مباشر من الموقع',
      customer: {
        name: customer.name || 'عميل برو هاوس',
        phone: customer.phone || '05xxxxxxxx'
      },
      products: products,
      payments: [{
        payment_method_id: 'pm_mada_applepay',
        payment_method_name: 'Apple Pay / Mada',
        amount: total
      }],
      pricing: { subtotal, tax_amount: taxAmount, total, currency: 'SAR' },
      meta: { source: 'prohouse_web', created_at: new Date().toISOString() }
    };
  }

  async submitOrder(cart, customer, orderType = 'pickup', branchKey = 'rawdah') {
    const payload = this.formatFoodicsPayload(cart, customer, orderType, branchKey);
    if (this.config.mode === 'mock') {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        success: true,
        mode: 'mock',
        orderId: 'ord_' + Math.random().toString(36).substring(2, 10),
        referenceNumber: 'PH-' + Math.floor(1000 + Math.random() * 9000),
        payload: payload,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      };
    } else {
      try {
        const res = await fetch(this.config.apiBaseUrl + '/orders', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + this.config.apiToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        return { success: true, mode: 'live', orderId: data.data.id, referenceNumber: data.data.reference, payload };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  }
}

window.FoodicsOrderingEngine = FoodicsOrderingEngine;
window.FOODICS_CONFIG = FOODICS_CONFIG;
