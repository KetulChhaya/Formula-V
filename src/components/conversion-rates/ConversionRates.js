import { useEffect, useState, useRef } from "react";
import { loadData } from "../../utils/data";
import * as d3 from "d3";

const ConversionRates = () => {
  const svgRef = useRef();
  const [races, setRaces] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [qualifying, setQualifying] = useState([]);
  const [results, setResults] = useState([]);
  const [circuitData, setCircuitData] = useState(null);
  const [selectedCircuit, setSelectedCircuit] = useState(null);

  // Load and process data
  useEffect(() => {
    loadData().then(({ races, circuits, qualifying, results }) => {
      setRaces(races);
      setCircuits(circuits);
      setQualifying(qualifying);
      setResults(results);

      const filteredRaces = races.filter(
        (r) => +r.year >= 2018 && +r.year <= 2024
      );
      const circuitIds = [...new Set(filteredRaces.map((r) => r.circuitId))];
      const filteredCircuits = circuits.filter((c) =>
        circuitIds.includes(c.circuitId)
      );

      const raceMap = {};
      filteredRaces.forEach((r) => {
        raceMap[r.raceId] = {
          year: +r.year,
          circuitId: r.circuitId,
          name: r.name,
        };
      });

      const conversionRates = filteredRaces.map((race) => {
        const raceId = race.raceId;
        const top10Qualifiers = qualifying
          .filter((q) => q.raceId === raceId && +q.position <= 10)
          .map((q) => q.driverId);
        const top10Finishers = results.filter(
          (res) =>
            res.raceId === raceId &&
            top10Qualifiers.includes(res.driverId) &&
            +res.positionOrder <= 10
        );
        const conversionRate = (top10Finishers.length / 10) * 100;
        return {
          circuitId: raceMap[raceId].circuitId,
          year: raceMap[raceId].year,
          conversionRate,
        };
      });

      const circuitData = {};
      filteredCircuits.forEach((c) => {
        const rates = conversionRates.filter(
          (cr) => cr.circuitId === c.circuitId
        );
        const yearsData = rates
          .map((cr) => ({ year: cr.year, conversionRate: cr.conversionRate }))
          .sort((a, b) => a.year - b.year);
        const averageRate = d3.mean(rates, (cr) => cr.conversionRate);
        circuitData[c.circuitId] = {
          circuitName: c.name,
          averageRate,
          yearsData,
        };
      });

      setCircuitData(circuitData);
      if (filteredCircuits.length > 0) {
        setSelectedCircuit(filteredCircuits[0].circuitId); // Set initial circuit
      }
    });
  }, []);

  // Setup chart
  useEffect(() => {
    if (!circuitData) return;

    const svg = d3.select(svgRef.current);
    const margin = { top: 60, right: 80, bottom: 60, left: 80 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([2018, 2024]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    // X-axis with gridlines and label
    g.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat(d3.format("d"))
          .tickSize(-height)
          .tickPadding(10)
      )
      .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "#333")
      .attr("font-size", "14px")
      .attr("font-family", "Formula1, sans-serif")
      .text("Year");

    // Y-axis with gridlines and label
    g.append("g")
      .attr("class", "y-axis")
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickSize(-width)
          .tickPadding(10)
          .tickFormat((d) => `${d}%`)
      )
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2 + 60)
      .attr("y", -40)
      .attr("fill", "#333")
      .attr("font-size", "14px")
      .attr("font-family", "Formula1, sans-serif")
      .text("Conversion Rate (%)");

    // Style gridlines
    g.selectAll(".x-axis .tick line, .y-axis .tick line")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2");

    // Style axis lines
    g.selectAll(".x-axis .domain, .y-axis .domain")
      .attr("stroke", "#333")
      .attr("stroke-width", 1.5);

    // Add chart title
    svg
      .append("text")
      .attr("x", margin.left + width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .attr("font-family", "Formula1, sans-serif")
      .attr("fill", "#222")
      .attr("id", "chart-title");

    // Add average rate text inside the chart
    svg
      .append("text")
      .attr("x", margin.left + width - 10)
      .attr("y", margin.top + 15)
      .attr("text-anchor", "end")
      .attr("font-size", "12px")
      .attr("font-family", "Formula1, sans-serif")
      .attr("fill", "#666")
      .attr("id", "average-rate");

    // Add background gradient
    const defs = svg.append("defs");
    defs
      .append("linearGradient")
      .attr("id", "area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%")
      .selectAll("stop")
      .data([
        { offset: "0%", color: "rgba(70, 130, 180, 0.2)" },
        { offset: "100%", color: "rgba(70, 130, 180, 0)" },
      ])
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    g.append("path").attr("class", "area").attr("fill", "url(#area-gradient)");

    g.append("path")
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "#4682b4")
      .attr("stroke-width", 2.5)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    g.append("g").attr("class", "points");

    d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "5px 10px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)")
      .style("font-family", "Formula1, sans-serif")
      .style("font-size", "12px")
      .style("display", "none");
  }, [circuitData]);

  // Update chart dynamically when selectedCircuit changes
  useEffect(() => {
    if (!circuitData || !selectedCircuit) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select("g");
    const margin = { top: 60, right: 80, bottom: 60, left: 80 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([2018, 2024]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);
    const line = d3
      .line()
      .x((d) => x(d.year))
      .y((d) => y(d.conversionRate))
      .defined((d) => d.conversionRate !== null);
    const area = d3
      .area()
      .x((d) => x(d.year))
      .y0(height)
      .y1((d) => y(d.conversionRate))
      .defined((d) => d.conversionRate !== null);

    const data = circuitData[selectedCircuit];

    // Update chart title
    d3.select("#chart-title").text(`Conversion Rates for ${data.circuitName}`);

    // Update average rate
    d3.select("#average-rate").text(`Avg: ${data.averageRate.toFixed(1)}%`);

    // Update area with animation
    g.select(".area")
      .datum(data.yearsData)
      .transition()
      .duration(750)
      .attr("d", area);

    // Update line with animation
    g.select(".line")
      .datum(data.yearsData)
      .transition()
      .duration(750)
      .attr("d", line);

    // Update points with animation
    const points = g
      .select(".points")
      .selectAll("circle")
      .data(data.yearsData, (d) => d.year);

    // Exit
    points
      .exit()
      .transition()
      .duration(500)
      .attr("r", 0)
      .attr("opacity", 0)
      .remove();

    // Enter
    const enter = points
      .enter()
      .append("circle")
      .attr("r", 0)
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.conversionRate))
      .attr("fill", "#4682b4")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .attr("opacity", 0);

    // Update
    const update = enter
      .merge(points)
      .on("mouseover", (event, d) => {
        d3.select(".tooltip")
          .style("display", "block")
          .html(`Year: ${d.year}<br>Rate: ${d.conversionRate.toFixed(1)}%`)
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 30}px`);
      })
      .on("mouseout", () => d3.select(".tooltip").style("display", "none"));

    // Transition
    update
      .transition()
      .duration(750)
      .attr("cx", (d) => x(d.year))
      .attr("cy", (d) => y(d.conversionRate))
      .attr("r", 5)
      .attr("opacity", 1);
  }, [selectedCircuit, circuitData]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#f5f5f5",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ marginRight: "20px", marginTop: "10px" }}>
          <label
            htmlFor="circuit-select"
            className="block text-sm font-medium text-gray-700 font-[Formula1]"
          >
            Select Circuit:
          </label>
          <select
            id="circuit-select"
            value={selectedCircuit || ""}
            onChange={(e) => setSelectedCircuit(e.target.value)}
            className="mt-1 block w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-[Formula1]"
            onFocus={(e) => {
              e.target.style.borderColor = "#4682b4";
              e.target.style.boxShadow = "0 0 5px rgba(70, 130, 180, 0.5)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#ccc";
              e.target.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.1)";
            }}
          >
            {circuitData &&
              Object.entries(circuitData).map(([circuitId, data]) => (
                <option key={circuitId} value={circuitId}>
                  {data.circuitName}
                </option>
              ))}
          </select>
        </div>
        <div className="flex flex-col" style={{ maxWidth: "1100px" }}>
          <svg
            ref={svgRef}
            width="1100"
            height="600"
            style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          ></svg>
          <h3 className="font-[Formula1] mt-5 justify-center text-center">
            Ever wondered who can handle pressure on race day? This
            visualization reveals how often drivers who qualified in the top 10
            managed to finish the race in the top 10. It highlights consistency
            and clutch performance
          </h3>
        </div>
      </div>
    </div>
  );
};

export default ConversionRates;
