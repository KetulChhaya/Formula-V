import React, { useState, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { loadData } from "../../utils/data";
import { constructorColorMap, constructorNameColorMap } from "../../utils/utils";

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

const PitStopEfficiencyImpact = () => {
  const [races, setRaces] = useState([]);
  const [results, setResults] = useState([]);
  const [lapTimes, setLapTimes] = useState([]);
  const [pitStops, setPitStops] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedRace, setSelectedRace] = useState("");
  const [currentLap, setCurrentLap] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [driverMap, setDriverMap] = useState(null);
  const [constructorMap, setConstructorMap] = useState(null);
  const svgRef = useRef();

  // Load and filter data post-2014
  useEffect(() => {
    loadData().then(
      ({ races, results, lapTimes, pitStops, drivers, constructors }) => {
        const filteredRaces = races.filter((race) => +race.year >= 2018);
        const raceIds = filteredRaces.map((race) => race.raceId);
        const filteredResults = results.filter((result) =>
          raceIds.includes(result.raceId)
        );
        const filteredLapTimes = lapTimes.filter((lt) =>
          raceIds.includes(lt.raceId)
        );
        const filteredPitStops = pitStops.filter((ps) =>
          raceIds.includes(ps.raceId)
        );

        setRaces(filteredRaces);
        setResults(filteredResults);
        setLapTimes(filteredLapTimes);
        setPitStops(filteredPitStops);
        setSelectedYear(filteredRaces[0]?.year || "");
        setSelectedRace(filteredRaces[0]?.raceId || "");
        setDrivers(drivers);
        const drivMap = drivers.reduce(
          (acc, { driverId, forename, surname }) => {
            acc[driverId] = `${forename} ${surname}`;
            return acc;
          },
          {}
        );

        setDriverMap(drivMap);

        const consMap = constructors.reduce((acc, { constructorId, name }) => {
          acc[constructorId] = name;
          return acc;
        }, {});

        // console.log("Constructor Map ", consMap);
        setConstructorMap(consMap);

        console.log("Filtered Driver ", drivers);
      }
    );
  }, []);

  // Filter data by selected race
  const [filteredLapTimes, setFilteredLapTimes] = useState([]);
  const [filteredPitStops, setFilteredPitStops] = useState([]);
  useEffect(() => {
    if (selectedRace && lapTimes.length && pitStops.length) {
      setFilteredLapTimes(lapTimes.filter((lt) => lt.raceId === selectedRace));
      setFilteredPitStops(pitStops.filter((ps) => ps.raceId === selectedRace));
    }
  }, [selectedRace, lapTimes, pitStops]);

  // Process data for visualization
  const driversData = useMemo(() => {
    if (!filteredLapTimes.length || !filteredPitStops.length) return [];
    const driverIds = [...new Set(filteredLapTimes.map((lt) => lt.driverId))];
    return driverIds.map((driverId) => {
      const driverLapTimes = filteredLapTimes
        .filter((lt) => lt.driverId === driverId)
        .sort((a, b) => +a.lap - +b.lap);
      const driverPitStops = filteredPitStops
        .filter((ps) => ps.driverId === driverId)
        .sort((a, b) => +a.lap - +b.lap);
      const laps = driverLapTimes.map((lt) => ({
        lap: +lt.lap,
        position: +lt.position,
      }));
      const pitStops = driverPitStops.map((ps) => ({
        lap: +ps.lap,
        duration: +ps.milliseconds,
      }));
      const result = results.find(
        (r) => r.raceId === selectedRace && r.driverId === driverId
      );
      return {
        driverId,
        constructorId: result?.constructorId || "unknown",
        laps,
        pitStops,
      };
    });
  }, [filteredLapTimes, filteredPitStops, results, selectedRace]);

  const maxLap = useMemo(
    () =>
      filteredLapTimes.length
        ? Math.max(...filteredLapTimes.map((lt) => +lt.lap))
        : 0,
    [filteredLapTimes]
  );
  const numDrivers = driversData.length;

  // Animation control
  useEffect(() => {
    if (isPlaying && currentLap < maxLap) {
      const interval = setInterval(() => {
        setCurrentLap((prev) => (prev + 1 >= maxLap ? maxLap : prev + 1));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentLap, maxLap]);

  // D3 Visualization with smooth transitions
  useEffect(() => {
    if (!driversData.length || !maxLap) return;
    const svg = d3.select(svgRef.current);
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    svg
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("overflow", "visible");

    const xScale = d3
      .scaleLinear()
      .domain([1, maxLap])
      .range([margin.left, width - 300]);
    const yScale = d3
      .scaleLinear()
      .domain([1, numDrivers])
      .range([margin.top, height]);

    // Axes
    svg.selectAll(".axis").remove();
    svg
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0, ${height + margin.top})`)
      .call(d3.axisBottom(xScale).ticks(maxLap / 5))
      .append("text")
      .attr("class", "label")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .text("Lap Number (Race Progression)");
    svg
      .append("g")
      .attr("class", "axis y-axis")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).ticks(numDrivers))
      .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .text("Position (1 = P1, Higher = Lower)");

    // Lines with smooth transition
    const line = d3
      .line()
      .x((d) => xScale(d.lap))
      .y((d) => yScale(d.position))
      .defined((d) => d.position != null)
      .curve(d3.curveStepAfter);

    const paths = svg
      .selectAll(".driver-path")
      .data(driversData, (d) => d.driverId);
    paths
      .enter()
      .append("path")
      .attr("class", "driver-path")
      .attr("fill", "none")
      .attr("stroke", (d) => {
        return constructorColorMap[d.constructorId] || "#888";
      })
      .attr("stroke-width", 2)
      .merge(paths)
      .transition()
      .duration(500)
      .ease(d3.easeLinear)
      .attr("d", (d) => line(d.laps.filter((l) => l.lap <= currentLap)));
    paths.exit().remove();

    // Pit stop markers with smooth transition and team colors
    const pitStopData = driversData
      .flatMap((d) =>
        d.pitStops
          .filter((ps) => ps.lap <= currentLap)
          .map((ps) => ({
            ...ps,
            driverId: d.driverId,
            constructorId: d.constructorId,
            position: d.laps.find((l) => l.lap === ps.lap)?.position,
          }))
      )
      .filter((d) => d.position != null);

    const durationExtent = d3.extent(pitStopData, (d) => d.duration);
    const sizeScale = d3.scaleLinear().domain(durationExtent).range([3, 10]);

    const markers = svg
      .selectAll(".pit-stop-marker")
      .data(pitStopData, (d) => `${d.driverId}-${d.lap}`);

    const markersEnter = markers
      .enter()
      .append("circle")
      .attr("class", "pit-stop-marker")
      .attr("fill", (d) => constructorColorMap[d.constructorId] || "#888");

    const allMarkers = markersEnter.merge(markers);

    // Attach event listeners BEFORE transition
    allMarkers
      .on("mouseover", (event, d) => {
        d3.select("#tooltip")
          .style("visibility", "visible")
          .html(
            `Driver: ${driverMap[d.driverId] || d.driverId}<br>
         Constructor: ${constructorMap[d.constructorId]}<br>
         Lap: ${d.lap}<br>
         Position: ${d.position}<br>
         Duration: ${formatMs(d.duration)}<br>
         Tire Change: Yes`
          )
          .style("top", `${event.pageY}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => {
        d3.select("#tooltip").style("visibility", "hidden");
      });

    // Now transition safely
    allMarkers
      .transition()
      .duration(500)
      .ease(d3.easeQuadInOut)
      .attr("cx", (d) => xScale(d.lap))
      .attr("cy", (d) => yScale(d.position))
      .attr("r", (d) => sizeScale(d.duration));

    markers.exit().remove();

    // Current lap indicator
    svg.selectAll(".current-lap-line").remove();
    svg
      .append("line")
      .attr("class", "current-lap-line")
      .attr("x1", xScale(currentLap))
      .attr("x2", xScale(currentLap))
      .attr("y1", margin.top)
      .attr("y2", height)
      .attr("stroke", "gray")
      .attr("stroke-dasharray", "4")
      .transition()
      .duration(500)
      .ease(d3.easeQuadInOut);

    svg.selectAll(".current-lap-label").remove();
    svg
      .append("text")
      .attr("class", "current-lap-label")
      .attr("x", xScale(currentLap))
      .attr("y", margin.top - 10)
      .attr("text-anchor", "middle")
      .text(`Lap ${currentLap}`)
      .transition()
      .duration(500)
      .ease(d3.easeQuadInOut);

    // Legend
    const legend = svg
      .selectAll(".legend")
      .data(Array.from(Object.keys(constructorColorMap)).map((key) => constructorMap[key]))
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        (d, i) =>
          `translate(${width + margin.left + 20}, ${margin.top + i * 20})`
      );

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", (d) => {
        return constructorNameColorMap[d] || "#888";
      })

    legend
      .append("text")
      .attr("x", 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "start")
      .text((d) => d
      );

    // Tooltip
    d3.select("body")
      .append("div")
      .attr("id", "tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "10px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("visibility", "hidden")
      .style("pointer-events", "none");
  }, [driversData, currentLap, maxLap]);

  // UI
  const years = [...new Set(races.map((r) => r.year))].sort().reverse();
  const racesForYear = races.filter((r) => r.year === selectedYear);

  return (
    <div className="max-w-7xl m-auto mt-10">
    <div className="p-4" style={{ minHeight: "100vh" }}>
      <h1 className="text-2xl font-bold mb-4">Pit Stop Efficiency Impact</h1>
      <div className="flex space-x-4 mb-4">
        <select
          className="p-2 border rounded"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          className="p-2 border rounded"
          value={selectedRace}
          onChange={(e) => {
            setSelectedRace(e.target.value);
            setCurrentLap(1);
          }}
        >
          {racesForYear.map((race) => (
            <option key={race.raceId} value={race.raceId}>
              {race.name}
            </option>
          ))}
        </select>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => setIsPlaying((prev) => !prev)}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>
      <svg ref={svgRef}></svg>
      <div className="mt-4 text-sm">
        <p>
          <strong>Fig.</strong> This visualization tracks driver positions
          during the race, highlighting how pit stop efficiency influences
          race outcomes.
        </p>
      
      </div>
    </div>
    </div>
  );
};

export default PitStopEfficiencyImpact;
