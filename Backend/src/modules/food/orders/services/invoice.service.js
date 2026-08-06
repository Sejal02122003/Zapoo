import { FoodOrder } from '../models/order.model.js';
import { FoodTransaction } from '../models/foodTransaction.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodUser } from '../../../../core/users/user.model.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodBusinessSettings } from '../../admin/models/businessSettings.model.js';

// Number to Words Converter (Indian Numbering System)
function numberToWords(num) {
    if (num === 0) return 'Zero Rupees Only';
    
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convert = (n) => {
        if (n < 20) return a[n];
        const digit = n % 10;
        if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : ' ');
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 === 0 ? '' : convert(n % 100));
        if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 === 0 ? '' : convert(n % 1000));
        if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 === 0 ? '' : convert(n % 100000));
        return convert(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 === 0 ? '' : convert(n % 10000000));
    };

    const wholePart = Math.floor(num);
    const fractionPart = Math.round((num - wholePart) * 100);

    let words = convert(wholePart) + 'Rupees ';
    if (fractionPart > 0) {
        words += 'And ' + convert(fractionPart) + 'Paisa ';
    }
    return words.trim() + ' Only';
}

function getFormattedDate(dateObj) {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export async function generateOrderInvoice(orderId) {
    const order = await FoodOrder.findOne({ orderId })
        .populate('restaurantId')
        .lean();

    if (!order) {
        throw new ValidationError("Order not found");
    }

    const transaction = await FoodTransaction.findOne({ orderId: order._id }).lean();
    if (!transaction) {
        throw new ValidationError("Transaction not found for this order");
    }

    const user = await FoodUser.findById(order.userId).select('name phone').lean();
    const customerName = user ? user.name : 'Guest Customer';

    const restaurant = order.restaurantId;
    const items = Array.isArray(order.items) ? order.items : [];

    const businessSettings = await FoodBusinessSettings.findOne().lean() || {};

    // --- Restaurant Invoice Data ---
    const gstRate = 5; // Standard 5% GST for restaurants without ITC
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;

    const invoiceDate = getFormattedDate(transaction.createdAt || order.createdAt);
    const orderDateFormatted = getFormattedDate(order.createdAt);
    
    let totalDiscountApplied = Number(order.pricing?.restaurantCouponDiscount) || 0;
    const grossSubtotal = (Number(order.pricing?.subtotal) || 0) + (Number(order.pricing?.itemDiscount) || 0);

    const restaurantItems = items.map(it => {
        const qty = Number(it.quantity) || 1;
        const originalPrice = Number(it.originalPrice || it.price) || 0;
        const discountedPrice = Number(it.discountedPrice || it.price) || 0;
        const grossValue = originalPrice * qty;
        
        let itemDiscount = (originalPrice - discountedPrice) * qty;

        if (grossSubtotal > 0 && totalDiscountApplied > 0) {
             const share = (discountedPrice * qty) / (Number(order.pricing?.subtotal) || 1);
             itemDiscount += (share * totalDiscountApplied);
        }

        const netValue = Math.max(0, grossValue - itemDiscount);
        const cgst = netValue * (cgstRate / 100);
        const sgst = netValue * (sgstRate / 100);
        const total = netValue + cgst + sgst;

        return {
            name: `${qty} x ${it.name}`,
            grossValue: Number(grossValue.toFixed(2)),
            discount: Number(itemDiscount.toFixed(2)),
            netValue: Number(netValue.toFixed(2)),
            cgstRate: cgstRate + '%',
            cgstAmount: Number(cgst.toFixed(3)),
            sgstRate: sgstRate + '%',
            sgstAmount: Number(sgst.toFixed(3)),
            total: Number(total.toFixed(2))
        };
    });

    const packagingGross = Number(order.pricing?.packagingFee) || 0;
    const packagingCgst = packagingGross * (cgstRate / 100);
    const packagingSgst = packagingGross * (sgstRate / 100);
    const packagingTotal = packagingGross + packagingCgst + packagingSgst;

    const restaurantTotalValue = restaurantItems.reduce((acc, item) => acc + item.total, 0) + packagingTotal;

    const restaurantInvoice = {
        restaurantName: restaurant?.restaurantName || 'N/A',
        legalEntityName: restaurant?.legalEntityName || restaurant?.restaurantName || 'N/A',
        address: restaurant?.address || restaurant?.location?.formattedAddress || 'N/A',
        gstin: restaurant?.gstin || 'UNREGISTERED',
        fssai: restaurant?.fssaiLicense || 'N/A',
        invoiceNo: transaction.transactionReadableId || `TXN${order.orderId}`,
        invoiceDate: invoiceDate,
        customerName: customerName,
        deliveryAddress: order.deliveryAddress?.address || 'Pickup',
        stateName: 'West Bengal',
        stateCode: '19',
        hsnCode: '996331',
        serviceDescription: 'Restaurant Service',
        items: restaurantItems,
        packagingCharge: {
            grossValue: Number(packagingGross.toFixed(2)),
            discount: 0,
            netValue: Number(packagingGross.toFixed(2)),
            cgstRate: cgstRate + '%',
            cgstAmount: Number(packagingCgst.toFixed(3)),
            sgstRate: sgstRate + '%',
            sgstAmount: Number(packagingSgst.toFixed(3)),
            total: Number(packagingTotal.toFixed(2))
        },
        finalAmount: Number(restaurantTotalValue.toFixed(2)),
        amountInWords: numberToWords(Number(restaurantTotalValue.toFixed(2))),
        orderId: order.orderId,
        orderDate: orderDateFormatted
    };

    // --- Platform Invoice Data ---
    const platformFee = Number(order.pricing?.platformFee) || 0;
    const deliveryFee = Number(order.pricing?.deliveryFee) || 0;
    const weatherFee = Number(order.pricing?.weatherFee) || 0;
    
    let totalPlatformDiscount = Number(order.pricing?.discount) || 0;
    
    const platformServicesGross = platformFee + deliveryFee + weatherFee - totalPlatformDiscount;
    const taxablePlatformAmount = Math.max(0, platformServicesGross);

    const platformGstRate = 18;
    const platformCgstRate = platformGstRate / 2;
    const platformSgstRate = platformGstRate / 2;

    const platformCgst = taxablePlatformAmount * (platformCgstRate / 100);
    const platformSgst = taxablePlatformAmount * (platformSgstRate / 100);
    const platformTotal = taxablePlatformAmount + platformCgst + platformSgst;

    const platformInvoice = {
        legalEntityName: businessSettings.companyName || 'Zapoo Technologies Pvt Ltd',
        address: businessSettings.address || 'Sector V, Salt Lake, Kolkata, West Bengal 700091',
        pan: businessSettings.pan || 'AAZCS8726L',
        cin: businessSettings.cin || 'U72900WB2024PTC259987',
        gstin: businessSettings.gstin || '19AAZCS8726L1Z5',
        fssai: businessSettings.fssai || '',
        invoiceDate: invoiceDate,
        invoiceNo: `ZAP-${order.orderId}`,
        customerName: customerName,
        customerEmail: user?.email || 'customer@example.com',
        deliveryAddress: order.deliveryAddress?.address || 'Pickup',
        hsnCode: '999799',
        supplyDescription: 'Other Services N.E.C',
        taxableAmount: Number(taxablePlatformAmount.toFixed(2)),
        cgstAmount: Number(platformCgst.toFixed(3)),
        sgstAmount: Number(platformSgst.toFixed(3)),
        total: Number(platformTotal.toFixed(2)),
        amountInWords: numberToWords(Number(platformTotal.toFixed(2))),
        orderId: order.orderId,
        orderDate: orderDateFormatted
    };

    // --- Customer Receipt Data ---
    const orderTimeFormatted = order.createdAt ? new Date(order.createdAt).toLocaleString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    }) : '';

    const customerItems = items.map(it => {
        const qty = Number(it.quantity) || 1;
        const price = Number(it.price) || 0;
        return {
            name: it.name,
            quantity: qty,
            unitPrice: price,
            totalPrice: price * qty
        };
    });

    const taxesAmount = Number(order.pricing?.tax) || 0;
    const deliveryChargeSubtotal = Number(order.pricing?.deliveryFee) || 0;
    const platformFeeAmount = Number(order.pricing?.platformFee) || 0;
    const weatherFeeAmount = Number(order.pricing?.weatherFee) || 0;
    const packagingChargeAmount = Number(order.pricing?.packagingFee) || 0;
    const restaurantPromo = Number(order.pricing?.restaurantCouponDiscount) || 0;
    const platformPromo = Number(order.pricing?.discount) || 0; // Total platform discount
    const customerTotalAmount = Number(order.pricing?.total) || 0;

    const customerReceipt = {
        orderId: order.orderId,
        orderTime: orderTimeFormatted,
        customerName: customerName,
        deliveryAddress: order.deliveryAddress?.address || 'Pickup',
        restaurantName: restaurant?.restaurantName || 'N/A',
        restaurantAddress: restaurant?.address || restaurant?.location?.formattedAddress || 'N/A',
        deliveryPartnerName: order.driverId ? (order.driverName || 'Assigned Partner') : 'Not Assigned',
        items: customerItems,
        taxes: taxesAmount,
        deliveryChargeSubtotal: deliveryChargeSubtotal + weatherFeeAmount,
        restaurantPackagingCharges: packagingChargeAmount,
        platformFee: platformFeeAmount,
        restaurantPromo: restaurantPromo,
        platformPromo: platformPromo, // Free delivery with Gold, etc
        total: customerTotalAmount,
        restaurantFssai: restaurant?.fssaiLicense || '12822013001445',
        platformFssai: feeSettings.platformFssai || '10019064001810'
    };

    return {
        restaurantInvoice,
        platformInvoice,
        customerReceipt
    };
}
