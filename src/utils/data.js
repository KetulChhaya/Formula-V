import * as d3 from "d3";
export const loadData = async () => {
  const drivers = await d3.csv("/data/drivers.csv");
  const races = await d3.csv("/data/races.csv");
  const lapTimes = await d3.csv("/data/lap_times.csv");
  const qualifying = await d3.csv("/data/qualifying.csv");
  const results = await d3.csv("/data/results.csv");
  const pitStops = await d3.csv("/data/pit_stops.csv");
  const circuits = await d3.csv("/data/circuits.csv");
  const constructors = await d3.csv("/data/constructors.csv");
  const seasons = await d3.csv("/data/seasons.csv");
  const driver_standings = await d3.csv("/data/driver_standings.csv");

  return { drivers, races, lapTimes, qualifying, results, pitStops, circuits, constructors, seasons, driver_standings };
};
