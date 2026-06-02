import type { Bus, Stop } from '@/types';
import { crowdMeta } from '@/theme';
import { etaMinutes, haversineKm, nearestStop, routeStopsForBus } from '@/utils/geo';

type TransitResult = {
  answer: string;
  bus_number: string | null;
  destination_note: string;
  estimated_fare?: string;
  steps: string[];
};

type JourneyResult = {
  summary: string;
  board_stop: string;
  alight_stop: string;
  total_fare?: string;
  total_time?: string;
  steps: string[];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value: string) {
  return normalize(value).split(' ').filter((item) => item.length > 1);
}

function bestStopMatch(query: string, stops: Stop[]) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return null;
  const ranked = stops
    .map((stop) => {
      const name = normalize(stop.name);
      const exact = name.includes(normalize(query)) ? 6 : 0;
      const score = queryTokens.reduce((sum, token) => sum + (name.includes(token) ? 2 : 0), exact);
      return { stop, score };
    })
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].stop : null;
}

function scoreBus(bus: Bus, query: string, destination: Stop | null, userLocation?: [number, number]) {
  const haystack = normalize(`${bus.bus_number} ${bus.route_name} ${bus.next_stop || ''}`);
  const queryTokens = tokens(query);
  let score = queryTokens.reduce((sum, token) => sum + (haystack.includes(token) ? 8 : 0), 0);
  if (normalize(bus.bus_number) === normalize(query)) score += 40;
  if (destination && haystack.includes(normalize(destination.name).split(' ')[0])) score += 18;
  if (bus.is_active) score += 10;
  if (bus.crowd_level === 'empty') score += 8;
  if (bus.crowd_level === 'available') score += 6;
  if (bus.crowd_level === 'standing') score += 2;
  if (bus.crowd_level === 'overcrowded') score -= 8;
  if (userLocation && bus.latitude != null && bus.longitude != null) {
    score += Math.max(0, 12 - haversineKm(userLocation, [bus.latitude, bus.longitude]));
  }
  return score;
}

function fareForDistance(distanceKm: number) {
  if (distanceKm <= 3) return 'Rs.10-15';
  if (distanceKm <= 8) return 'Rs.15-25';
  if (distanceKm <= 15) return 'Rs.25-35';
  return 'Rs.35-50';
}

export async function testLocalAi() {
  return true;
}

export async function analyzeCrowdImage(imageDataUrl: string, maxCapacity = 50) {
  const hasFrame = imageDataUrl.length > 12000;
  return {
    count: 0,
    headsFound: 0,
    confidence: hasFrame ? 35 : 0,
    relevant: hasFrame,
    note: hasFrame
      ? 'Camera frame captured. Accurate head counting needs an on-device ML detector, so this scan was not auto-accepted.'
      : 'No clear camera frame found.'
  };
}

export async function searchTransit(query: string, buses: Bus[], stops: Stop[], userLocation?: [number, number]): Promise<TransitResult> {
  const destination = bestStopMatch(query, stops);
  const ranked = buses
    .map((bus) => ({ bus, score: scoreBus(bus, query, destination, userLocation) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const selected = ranked[0]?.bus || null;
  const originStop = nearestStop(userLocation || null, stops)?.stop || null;

  if (!selected) {
    const fallbackStop = destination || originStop;
    return {
      answer: fallbackStop
        ? `I found ${fallbackStop.name}. Pin it on the map or search a route number for live buses nearby.`
        : 'Search by route number, bus number, or Hyderabad stop name.',
      bus_number: null,
      destination_note: fallbackStop?.name || 'No exact stop found',
      estimated_fare: 'Rs.10-35',
      steps: [
        originStop ? `Walk to ${originStop.name}.` : 'Enable location to find your nearest stop.',
        fallbackStop ? `Choose buses going toward ${fallbackStop.name}.` : 'Enter a destination or route number.',
        'Prefer green/yellow crowd status before boarding.'
      ]
    };
  }

  const routeStops = routeStopsForBus(selected, stops);
  const boardStop = originStop || routeStops[0];
  const alightStop = destination || routeStops[routeStops.length - 1] || boardStop;
  const busEta = boardStop ? etaMinutes(selected, boardStop) : null;
  const distance = boardStop && alightStop ? haversineKm([boardStop.latitude, boardStop.longitude], [alightStop.latitude, alightStop.longitude]) : 6;
  const crowd = crowdMeta[selected.crowd_level];
  const direct = destination && normalize(selected.route_name).includes(normalize(destination.name).split(' ')[0]);

  return {
    answer: `${direct ? 'Direct bus available' : 'Best live match'}: ${selected.bus_number} on ${selected.route_name}. Crowd is ${crowd.label}${busEta ? `, about ${busEta} min from ${boardStop.name}` : ''}.`,
    bus_number: selected.bus_number,
    destination_note: alightStop?.name || selected.route_name,
    estimated_fare: fareForDistance(distance),
    steps: [
      boardStop ? `Walk to ${boardStop.name}.` : 'Enable location for boarding stop.',
      `Board ${selected.bus_number} - ${selected.route_name}.`,
      alightStop ? `Get down near ${alightStop.name}.` : 'Follow the route on the live map.',
      `Crowd status: ${crowd.label}.`
    ]
  };
}

export async function planJourney(destinationText: string, stops: Stop[], userLocation?: [number, number]): Promise<JourneyResult> {
  const destination = bestStopMatch(destinationText, stops);
  const board = nearestStop(userLocation || null, stops)?.stop || stops[0];
  const alight = destination || stops.find((stop) => normalize(stop.name).includes(normalize(destinationText))) || stops[1] || board;
  const distance = haversineKm([board.latitude, board.longitude], [alight.latitude, alight.longitude]);
  const rideTime = Math.max(8, Math.round((distance / 18) * 60));
  const walkMinutes = userLocation ? Math.max(2, Math.round((haversineKm(userLocation, [board.latitude, board.longitude]) / 4.5) * 60)) : 5;
  const direct = distance < 13;

  return {
    summary: `${direct ? 'Direct route preferred' : 'Bus change may be required'}: start at ${board.name}, travel toward ${alight.name}.`,
    board_stop: board.name,
    alight_stop: alight.name,
    total_fare: fareForDistance(distance),
    total_time: `${walkMinutes + rideTime}-${walkMinutes + rideTime + 8} min`,
    steps: [
      `Walk ${walkMinutes} min to ${board.name}.`,
      direct ? `Take a bus toward ${alight.name}.` : 'Take the first bus toward Koti, MGBS, or Secunderabad.',
      direct ? `Get down at ${alight.name}.` : `Change bus and continue toward ${alight.name}.`,
      `Estimated fare: ${fareForDistance(distance)}.`
    ]
  };
}
