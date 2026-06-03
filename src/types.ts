export type CrowdLevel = 'empty' | 'available' | 'standing' | 'overcrowded';

export type BusType = 'ordinary' | 'metro_express' | 'metro_deluxe' | 'ac_bus' | 'electric';

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Stop = LatLng & {
  name: string;
  major?: boolean;
  roadMatched?: boolean;
};

export type Bus = {
  id: string;
  bus_number: string;
  route_name: string;
  route_id?: string;
  driver_name?: string;
  phone_number?: string;
  bus_type: BusType;
  latitude?: number;
  longitude?: number;
  crowd_level: CrowdLevel;
  passenger_count: number;
  max_capacity: number;
  is_active: boolean;
  live_session_id?: string;
  live_source?: 'driver_app';
  zone_id?: string;
  speed: number;
  next_stop?: string;
  heading: number;
  updated_at?: number;
  created_at?: number;
};

export type Route = {
  id: string;
  route_name: string;
  route_code: string;
  origin?: string;
  destination?: string;
  stops: Stop[];
  color: string;
  distance_km?: number;
  estimated_time_min?: number;
};

export type DriverProfile = {
  pin: string;
  driverName: string;
  phoneNumber: string;
  busNumber: string;
  routeName: string;
  busType: BusType;
  busId?: string;
  crowdLevel: CrowdLevel;
  passengerCount: number;
  loginTime: number;
};

export type RegularAlert = {
  id: string;
  busNumber: string;
  stopName: string;
  time: string;
  enabled: boolean;
};
