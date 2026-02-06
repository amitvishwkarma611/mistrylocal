// Central Service Area Configuration
// Scalable structure for geographic restrictions and future expansion

export const SUPPORTED_SERVICE_AREAS = ["airoli"] as const;

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
  airoli: {
    displayName: "Airoli, Mumbai",
    city: "mumbai",
    state: "maharashtra",
    pincodes: ["400707", "400708"],
    coordinates: {
      lat: 19.1709,
      lng: 72.9966
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
export const RESTRICTED_AREA_MESSAGE = "Service currently available only in Airoli, Mumbai.";