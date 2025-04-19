import { useEffect, useState, useRef } from "react";
import { loadData } from "../../utils/data";
import * as d3 from "d3";
import Dropdown from "../utils/Dropdown";

const Viz1 = () => {
  const [data, setData] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const svgRef = useRef();

  const width = 900; // Set your desired width
  const height = 500; // Set your desired height

  // Data loading and processing
  useEffect(() => {
    loadData().then(
      ({ drivers, races, lapTimes, qualifying, results, pitStops }) => {
        console.log(drivers.length);
        drivers = drivers.slice(0, 10);
        races = races.slice(0, 10);
        lapTimes = lapTimes.filter(
          (lt) =>
            drivers.some((d) => d.driverId === lt.driverId) &&
            races.some((r) => r.raceId === lt.raceId)
        );
        qualifying = qualifying.filter(
          (q) =>
            drivers.some((d) => d.driverId === q.driverId) &&
            races.some((r) => r.raceId === q.raceId)
        );
        results = results.filter(
          (r) =>
            drivers.some((d) => d.driverId === r.driverId) &&
            races.some((rc) => rc.raceId === r.raceId)
        );
        pitStops = pitStops.filter(
          (ps) =>
            drivers.some((d) => d.driverId === ps.driverId) &&
            races.some((rc) => rc.raceId === ps.raceId)
        );

        // Merge driver names into results
        results.forEach((result) => {
          const driver = drivers.find((d) => d.driverId === result.driverId);
          result.driverName = `${driver.forename} ${driver.surname}`;
        });

        // Group data by driverId and raceId using d3.group
        const lapTimesByDriverRace = d3.group(
          lapTimes,
          (d) => d.driverId,
          (d) => d.raceId
        );
        const qualifyingByDriverRace = d3.group(
          qualifying,
          (d) => d.driverId,
          (d) => d.raceId
        );
        const resultsByDriverRace = d3.group(
          results,
          (d) => d.driverId,
          (d) => d.raceId
        );

        // Structure your final data clearly
        const driverPerformance = drivers.map((driver) => {
          const driverId = driver.driverId;
          const driverRaces = races.map((race) => {
            const raceId = race.raceId;

            return {
              raceId,
              raceName: race.name,
              year: race.year,
              practiceLapTimes: [],
              qualifyingLapTimes:
                qualifyingByDriverRace
                  .get(driverId)
                  ?.get(raceId)
                  ?.map((q) => [q.Q1, q.Q2, q.Q3])
                  .flat()
                  .filter(Boolean) || [],
              qualifyingPosition:
                qualifyingByDriverRace.get(driverId)?.get(raceId)?.[0]
                  ?.position || null,
              raceLapTimes:
                lapTimesByDriverRace
                  .get(driverId)
                  ?.get(raceId)
                  ?.map((lt) => +lt.milliseconds) || [],
              racePositions:
                lapTimesByDriverRace
                  .get(driverId)
                  ?.get(raceId)
                  ?.map((lt) => +lt.position) || [],
              finalRacePosition:
                resultsByDriverRace.get(driverId)?.get(raceId)?.[0]
                  ?.positionOrder || null,
              pitStops: pitStops
                .filter(
                  (ps) => ps.driverId === driverId && ps.raceId === raceId
                )
                .map((ps) => ({ lap: +ps.lap, duration: +ps.duration })),
            };
          });

          return {
            driverId,
            name: `${driver.forename} ${driver.surname}`,
            races: driverRaces.filter((r) => r.finalRacePosition !== null),
          };
        });

        console.log(driverPerformance);

        setData(driverPerformance);
      }
    );
  }, []);

  // Visualization with D3.js (example visualization structure)
  // useEffect(() => {
  //   if (data.length === 0) return; // Wait until data is loaded

  //   const svg = d3.select(svgRef.current)
  //                 .attr('width', width)
  //                 .attr('height', height);

  //   // Clear previous content
  //   svg.selectAll('*').remove();

  //   // Example: draw simple paths or lines (adjust according to your data structure)
  //   data.forEach((driver, idx) => {
  //     const lineGenerator = d3.line()
  //       .x((d, i) => (i * (width / driver.races.length)))
  //       .y(d => height - d.finalRacePosition * 10)  // Example mapping, adjust accordingly
  //       .curve(d3.curveMonotoneX);

  //     svg.append('path')
  //       .datum(driver.races)
  //       .attr('fill', 'none')
  //       .attr('stroke', d3.schemeCategory10[idx % 10])
  //       .attr('stroke-width', 2)
  //       .attr('d', lineGenerator);
  //   });

  // }, [data]);

  useEffect(() => {
    if (!selectedDriver || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 400;

    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const driverData = data.find((d) => d.driverId === selectedDriver);

    const xScale = d3
      .scaleLinear()
      .domain([0, driverData.races.length - 1])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([20, 1]) // Position 1 is top, invert Y
      .range([innerHeight, 0]);

    const line = d3
      .line()
      .x((d, i) => xScale(i))
      .y((d) => yScale(+d.finalRacePosition))
      .curve(d3.curveMonotoneX);

    const path = g
      .append("path")
      .datum(driverData.races)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Animate the path
    const totalLength = path.node().getTotalLength();
    path
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(2000)
      .ease(d3.easeSin)
      .attr("stroke-dashoffset", 0);

    // Add dots + hover tooltips
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "#eee")
      .style("padding", "6px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

    g.selectAll(".dot")
      .data(driverData.races)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d, i) => xScale(i))
      .attr("cy", (d) => yScale(+d.finalRacePosition))
      .attr("r", 5)
      .attr("fill", "orange")
      .on("mouseover", function (event, d) {
        tooltip
          .html(
            `<strong>${d.raceName} (${d.year})</strong><br/>Final Pos: ${d.finalRacePosition}<br/>Qual Pos: ${d.qualifyingPosition}`
          )
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`)
          .style("visibility", "visible");
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", 8)
          .attr("fill", "red");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
        d3.select(this)
          .transition()
          .duration(100)
          .attr("r", 5)
          .attr("fill", "orange");
      });
  }, [data, selectedDriver]);
  // Dropdown options



  const driverOptions = data.map((driver) => ({
    value: driver.driverId,
    label: driver.name,
  }));

  console.log(driverOptions);


  return (
    <div
      data-aos="fade-in"
      className="p-6 bg-black text-white rounded-lg shadow-lg space-y-4"
    >
      <h2 className="text-3xl font-bold text-red-600">
        Driver Performance Visualization
      </h2>

      {/* Select Driver Label */}
      <label htmlFor="driver-select" className="text-lg">
        Select Driver:{" "}
      </label>

      <Dropdown
          options={driverOptions}
          selectedOption={selectedDriver}
          onSelect={setSelectedDriver}
        />

      {/* Select Input */}
      {/* <select
        id="driver-select"
        onChange={(e) => setSelectedDriver(e.target.value)}
        className="mt-2 p-2 w-full bg-gray-800 text-white border-2 border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
      >
        <option value="">-- Select --</option>
        {data.map((driver) => (
          <option
            key={driver.driverId}
            value={driver.driverId}
            className="hover:bg-red-600"
          >
            {driver.name}
          </option>
        ))}
      </select> */}

      {/* SVG Container */}
      <div className="mt-6">
        <svg ref={svgRef} className="w-full h-80 bg-gray-800 rounded-md" />
      </div>
    </div>
  );
};

export default Viz1;
