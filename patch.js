const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Frontend', 'src', 'modules', 'Food', 'pages', 'user', 'cart', 'Cart.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Patch fallback calculation
const target1 = `    const couponDiscount = pricing?.couponDiscount !== undefined ? pricing.couponDiscount : (appliedCoupon?.discount || 0);
    const discount = pricing?.discount !== undefined ? pricing.discount : ((appliedCoupon?.discount || 0) + (appliedRestaurantCoupon?.discount || 0));`;

const replacement1 = `    const calculateFallbackDiscount = (coupon) => {
      if (!coupon) return 0;
      if (coupon.discount !== undefined) return coupon.discount;
      if (coupon.rewardType === 'CASHBACK') return 0;
      let savings = 0;
      if (coupon.discountType === 'PERCENTAGE') {
        const raw = (subtotal * (coupon.discountValue || 0)) / 100;
        savings = coupon.maxDiscountCap ? Math.min(raw, coupon.maxDiscountCap) : raw;
      } else {
        savings = coupon.discountValue || 0;
      }
      return savings;
    };

    const localCouponDiscount = calculateFallbackDiscount(appliedCoupon);
    const localRestaurantCouponDiscount = calculateFallbackDiscount(appliedRestaurantCoupon);

    const couponDiscount = pricing?.couponDiscount !== undefined ? pricing.couponDiscount : localCouponDiscount;
    const discount = pricing?.discount !== undefined ? pricing.discount : (localCouponDiscount + localRestaurantCouponDiscount);`;

// Patch Restaurant Offer bill UI
const target2 = `{((pricing?.restaurantCouponDiscount !== undefined ? pricing.restaurantCouponDiscount : (appliedRestaurantCoupon?.discount || 0)) > 0) && (
                        <div className="flex justify-between text-sm text-amber-600 dark:text-amber-500 font-medium">
                          <span>Restaurant Offer ({pricing?.appliedRestaurantCoupon?.code || appliedRestaurantCoupon?.code || 'Applied'})</span>
                          <span>-{RUPEE_SYMBOL}{(pricing?.restaurantCouponDiscount !== undefined ? pricing.restaurantCouponDiscount : (appliedRestaurantCoupon?.discount || 0)).toFixed(2)}</span>
                        </div>
                      )}`;

const replacement2 = `{((pricing?.restaurantCouponDiscount !== undefined ? pricing.restaurantCouponDiscount : localRestaurantCouponDiscount) > 0) && (
                        <div className="flex justify-between text-sm text-amber-600 dark:text-amber-500 font-medium">
                          <span>Restaurant Offer ({pricing?.appliedRestaurantCoupon?.code || appliedRestaurantCoupon?.code || 'Applied'})</span>
                          <span>-{RUPEE_SYMBOL}{(pricing?.restaurantCouponDiscount !== undefined ? pricing.restaurantCouponDiscount : localRestaurantCouponDiscount).toFixed(2)}</span>
                        </div>
                      )}`;

// Patch Wallet Cashback bill UI
const target3 = `{pricing?.appliedCoupon?.rewardType === 'CASHBACK' && pricing?.appliedCoupon?.amount > 0 && (
                        <div className="flex justify-between text-sm text-green-600 font-medium">
                          <span>Wallet Cashback ({pricing.appliedCoupon.code})</span>
                          <span>+{RUPEE_SYMBOL}{pricing.appliedCoupon.amount.toFixed(2)}</span>
                        </div>
                      )}`;

const replacement3 = `{((pricing?.appliedCoupon?.rewardType === 'CASHBACK' && pricing?.appliedCoupon?.amount > 0) || (appliedCoupon?.rewardType === 'CASHBACK' && appliedCoupon?.cashbackAmount > 0)) && (
                        <div className="flex justify-between text-sm text-green-600 font-medium">
                          <span>Wallet Cashback ({pricing?.appliedCoupon?.code || appliedCoupon?.code})</span>
                          <span>+{RUPEE_SYMBOL}{(pricing?.appliedCoupon?.amount || appliedCoupon?.cashbackAmount).toFixed(2)}</span>
                        </div>
                      )}`;

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch applied successfully!');
