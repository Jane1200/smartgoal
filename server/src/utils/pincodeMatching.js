/**
 * Pincode-based location matching utility
 * Handles matching users by pincode and nearby pincodes
 */

// Indian pincode ranges by state/region (simplified mapping)
// In production, use a complete pincode database
const pincodeRegions = {
  // Delhi
  '110001': { city: 'Delhi', state: 'Delhi', region: 'delhi', area: 'New Delhi', range: [110001, 110097] },
  '110002': { city: 'Delhi', state: 'Delhi', region: 'delhi', area: 'New Delhi', range: [110001, 110097] },
  '110003': { city: 'Delhi', state: 'Delhi', region: 'delhi', area: 'Kasturba Nagar', range: [110001, 110097] },
  // Mumbai
  '400001': { city: 'Mumbai', state: 'Maharashtra', region: 'mumbai', area: 'Fort', range: [400001, 400999] },
  '400002': { city: 'Mumbai', state: 'Maharashtra', region: 'mumbai', area: 'Colaba', range: [400001, 400999] },
  '400003': { city: 'Mumbai', state: 'Maharashtra', region: 'mumbai', area: 'Fort', range: [400001, 400999] },
  // Bangalore
  '560001': { city: 'Bangalore', state: 'Karnataka', region: 'bangalore', area: 'Residency Road', range: [560001, 560100] },
  '560002': { city: 'Bangalore', state: 'Karnataka', region: 'bangalore', area: 'Shivajinagar', range: [560001, 560100] },
  '560003': { city: 'Bangalore', state: 'Karnataka', region: 'bangalore', area: 'Chickpet', range: [560001, 560100] },
  // Hyderabad
  '500001': { city: 'Hyderabad', state: 'Telangana', region: 'hyderabad', area: 'Secunderabad', range: [500001, 500084] },
  '500002': { city: 'Hyderabad', state: 'Telangana', region: 'hyderabad', area: 'Hyderabad', range: [500001, 500084] },
  '500003': { city: 'Hyderabad', state: 'Telangana', region: 'hyderabad', area: 'Kacheguda', range: [500001, 500084] },
  // Pune
  '411001': { city: 'Pune', state: 'Maharashtra', region: 'pune', area: 'Camp', range: [411001, 411060] },
  '411002': { city: 'Pune', state: 'Maharashtra', region: 'pune', area: 'Somwar Peth', range: [411001, 411060] },
  '411003': { city: 'Pune', state: 'Maharashtra', region: 'pune', area: 'Shivajinagar', range: [411001, 411060] },
  // Chennai
  '600001': { city: 'Chennai', state: 'Tamil Nadu', region: 'chennai', area: 'Georgetown', range: [600001, 600119] },
  '600002': { city: 'Chennai', state: 'Tamil Nadu', region: 'chennai', area: 'Parry\'s', range: [600001, 600119] },
  '600003': { city: 'Chennai', state: 'Tamil Nadu', region: 'chennai', area: 'Esplanade', range: [600001, 600119] },
  // Kolkata
  '700001': { city: 'Kolkata', state: 'West Bengal', region: 'kolkata', area: 'Kolkata Town', range: [700001, 700160] },
  '700002': { city: 'Kolkata', state: 'West Bengal', region: 'kolkata', area: 'Shyambazar', range: [700001, 700160] },
  '700003': { city: 'Kolkata', state: 'West Bengal', region: 'kolkata', area: 'Machuabazar', range: [700001, 700160] },
  // Ahmedabad
  '380001': { city: 'Ahmedabad', state: 'Gujarat', region: 'ahmedabad', area: 'Civil Lines', range: [380001, 380076] },
  '380002': { city: 'Ahmedabad', state: 'Gujarat', region: 'ahmedabad', area: 'Bapunagar', range: [380001, 380076] },
  '380003': { city: 'Ahmedabad', state: 'Gujarat', region: 'ahmedabad', area: 'Kalupur', range: [380001, 380076] },
  // Jaipur
  '302001': { city: 'Jaipur', state: 'Rajasthan', region: 'jaipur', area: 'C Scheme', range: [302001, 302040] },
  '302002': { city: 'Jaipur', state: 'Rajasthan', region: 'jaipur', area: 'Sansar Chand Marg', range: [302001, 302040] },
  '302003': { city: 'Jaipur', state: 'Rajasthan', region: 'jaipur', area: 'Hospital Road', range: [302001, 302040] },
  // Surat
  '395001': { city: 'Surat', state: 'Gujarat', region: 'surat', area: 'Station Road', range: [395001, 395009] },
  '395002': { city: 'Surat', state: 'Gujarat', region: 'surat', area: 'Vesu', range: [395001, 395009] },
  '395003': { city: 'Surat', state: 'Gujarat', region: 'surat', area: 'Katargam', range: [395001, 395009] },
};

/**
 * Get the region info for a given pincode
 */
export function getPincodeRegion(pincode) {
  const pincodeStr = String(pincode).padStart(6, '0');
  
  for (const [basePincode, regionInfo] of Object.entries(pincodeRegions)) {
    const [minRange, maxRange] = regionInfo.range;
    const currentPincode = parseInt(pincodeStr);
    
    if (currentPincode >= minRange && currentPincode <= maxRange) {
      return {
        ...regionInfo,
        pincode: pincodeStr,
      };
    }
  }
  
  // Return null if no region found (unknown pincode)
  return null;
}

/**
 * Check if two pincodes are the same
 */
export function isSamePincode(pincode1, pincode2) {
  return String(pincode1).padStart(6, '0') === String(pincode2).padStart(6, '0');
}

/**
 * Get nearby pincodes (same city/region)
 */
export function getNearbyPincodes(pincode) {
  const region = getPincodeRegion(pincode);
  
  if (!region) {
    return [];
  }
  
  const nearbyPincodes = [];
  const [minRange, maxRange] = region.range;
  
  // Return a subset of nearby pincodes (e.g., every other pincode in range)
  for (let p = minRange; p <= maxRange; p += 1) {
    nearbyPincodes.push(String(p).padStart(6, '0'));
  }
  
  return nearbyPincodes;
}

/**
 * Group goal setters by pincode distance
 * Returns { samePincode, nearbyPincodes }
 */
export function groupByPincodeDistance(goalSetters, userPincode) {
  const userPincodeStr = String(userPincode).padStart(6, '0');
  const userRegion = getPincodeRegion(userPincode);
  
  const grouped = {
    samePincode: [],
    nearbyPincodes: [],
    differentRegion: []
  };
  
  goalSetters.forEach(gs => {
    const gsPincode = gs.location?.postalCode || gs.location?.pincode;
    
    if (!gsPincode) {
      grouped.differentRegion.push(gs);
      return;
    }
    
    const gsPincodeStr = String(gsPincode).padStart(6, '0');
    
    if (isSamePincode(userPincodeStr, gsPincodeStr)) {
      grouped.samePincode.push(gs);
    } else if (userRegion) {
      const gsRegion = getPincodeRegion(gsPincode);
      if (gsRegion && gsRegion.region === userRegion.region) {
        grouped.nearbyPincodes.push(gs);
      } else {
        grouped.differentRegion.push(gs);
      }
    } else {
      grouped.differentRegion.push(gs);
    }
  });
  
  return grouped;
}

/**
 * Get pincodes by region
 */
export function getPincodesByRegion(region) {
  const pincodes = [];
  for (const [basePincode, regionInfo] of Object.entries(pincodeRegions)) {
    if (regionInfo.region === region) {
      const [minRange, maxRange] = regionInfo.range;
      for (let p = minRange; p <= maxRange; p += 1) {
        pincodes.push(String(p).padStart(6, '0'));
      }
    }
  }
  return pincodes;
}