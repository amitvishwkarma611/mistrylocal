import { PRICE_CONFIG } from '../data/priceConfig';

/**
 * Get service price configuration
 * @param serviceType - Type of service (carpenter, plumber, electrician)
 * @returns Object containing visitCharge and minimumJobPrice
 */
export const getServicePrice = (serviceType: string) => {
  const type = serviceType?.toLowerCase() || 'carpenter';
  return PRICE_CONFIG[type as keyof typeof PRICE_CONFIG] || PRICE_CONFIG.carpenter;
};

/**
 * Apply minimum price rule to entered amount
 * @param serviceType - Type of service (carpenter, plumber, electrician)
 * @param enteredAmount - User-entered price amount
 * @returns Amount adjusted to meet minimum price requirement
 */
export const applyMinimumPrice = (serviceType: string, enteredAmount: number) => {
  const type = serviceType?.toLowerCase() || 'carpenter';
  const config = PRICE_CONFIG[type as keyof typeof PRICE_CONFIG] || PRICE_CONFIG.carpenter;
  
  // If entered amount is less than minimum, return minimum
  if (enteredAmount < config.minimumJobPrice) {
    return config.minimumJobPrice;
  }
  
  // Otherwise return the entered amount
  return enteredAmount;
};