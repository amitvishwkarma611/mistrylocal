// Central Service Area Configuration
// Scalable structure for geographic restrictions and future expansion

export const SUPPORTED_SERVICE_AREAS = ["sector45_gurgaon"] as const;

export type ServiceArea = typeof SUPPORTED_SERVICE_AREAS[number];

export const SERVICE_AREA_CONFIG: Record<ServiceArea, {
  displayName: string;
  city: string;
  state: string;
  pincodes: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
}> = {
  sector45_gurgaon: {
    displayName: "Sector 45, Gurgaon",
    city: "gurgaon",
    state: "haryana",
    pincodes: ["122001", "122002", "122003", "122004"],
    coordinates: {
      lat: 28.4899,
      lng: 77.0800
    }
  }
};

// Helper functions for area validation
export const isValidServiceArea = (area: string): area is ServiceArea => {
  return SUPPORTED_SERVICE_AREAS.includes(area as ServiceArea);
};

export const getServiceAreaByPincode = (pincode: string): ServiceArea | null => {
  for (const [area, config] of Object.entries(SERVICE_AREA_CONFIG)) {
    if (config.pincodes.includes(pincode)) {
      return area as ServiceArea;
    }
  }
  return null;
};

export const getServiceAreaConfig = (area: ServiceArea) => {
  return SERVICE_AREA_CONFIG[area];
};

// Validation message for restricted areas
export const RESTRICTED_AREA_MESSAGE = "Service currently available only in Sector 45, Gurgaon.";