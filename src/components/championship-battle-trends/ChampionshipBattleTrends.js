import { useEffect, useState, useRef } from "react";
import { loadData } from "../../utils/data";
import * as d3 from "d3";

const ChampionshipBattleTrends = () => {
  const svgRef = useRef();
  const [races, setRaces] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverStandings, setDriverStandings] = useState([]);
  const [seasonData, setSeasonData] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);

  // Load data
  useEffect(() => {
    loadData().then(({ races, drivers, driver_standings }) => {
      setRaces(races);
      setDrivers(drivers);
      setDriverStandings(driver_standings);
      setSelectedSeason("2018"); // Default season
    });
  }, []);

  // Process data for the selected season
  useEffect(() => {
    if (
      !races.length ||
      !drivers.length ||
      !driverStandings.length ||
      !selectedSeason
    )
      return;

    const filteredRaces = races
      .filter((r) => r.year === selectedSeason)
      .sort((a, b) => +a.round - +b.round);
    const raceIds = filteredRaces.map((r) => r.raceId);
    const driverIds = [
      ...new Set(
        driverStandings
          .filter((ds) => raceIds.includes(ds.raceId))
          .map((ds) => ds.driverId)
      ),
    ];

    const standingsData = driverIds.map((driverId) => {
      const driver = drivers.find((d) => d.driverId === driverId);
      const driverName = `${driver.forename} ${driver.surname}`;
      const positions = filteredRaces.map((race) => {
        const standing = driverStandings.find(
          (ds) => ds.raceId === race.raceId && ds.driverId === driverId
        );
        return standing ? standing.position : null;
      });
      // Get cluster from any standing in this season (consistent per season)
      const cluster = driverStandings.find(
        (ds) => ds.driverId === driverId && raceIds.includes(ds.raceId)
      ).cluster;
      return { driverId, driverName, positions, cluster };
    });

    setSeasonData({ races: filteredRaces, drivers: standingsData });
  }, [selectedSeason, races, drivers, driverStandings]);

  // Initialize the chart
  useEffect(() => {
    if (!seasonData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const margin = { top: 80, right: 200, bottom: 80, left: 90 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const yDomainMax = Math.max(seasonData.drivers.length, 20);

    const x = d3
      .scaleLinear()
      .domain([1, seasonData.races.length])
      .range([0, width]);
    const y = d3.scaleLinear().domain([1, yDomainMax]).range([0, height]);

    // Cluster-based highlights
    const lastRaceId = seasonData.races[seasonData.races.length - 1].raceId;
    const lastStandings = driverStandings.filter(
      (ds) => ds.raceId === lastRaceId
    );
    const clusterPositions = {};
    seasonData.drivers.forEach((driver) => {
      const standing = lastStandings.find(
        (ds) => ds.driverId === driver.driverId
      );
      if (standing) {
        const cluster = driver.cluster;
        if (!clusterPositions[cluster]) clusterPositions[cluster] = [];
        clusterPositions[cluster].push(standing.position);
      }
    });

    const highlights = Object.keys(clusterPositions).map((cluster) => {
      const positions = clusterPositions[cluster];
      return {
        cluster,
        minPos: Math.min(...positions),
        maxPos: Math.max(...positions),
      };
    });

    // Assign colors based on average position (lower is better)
    const clusterOrder = highlights
      .map((h) => ({
        cluster: h.cluster,
        avgPos:
          clusterPositions[h.cluster].reduce((a, b) => a + b, 0) /
          clusterPositions[h.cluster].length,
      }))
      .sort((a, b) => a.avgPos - b.avgPos);
    const colors = ["gold", "silver", "#cd7f32"]; // Top, Midfield, Backmarkers
    clusterOrder.forEach((co, i) => {
      highlights.find((h) => h.cluster === co.cluster).color = colors[i];
    });

    g.append("g")
      .attr("class", "highlights")
      .selectAll("rect")
      .data(highlights)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", (d) => y(d.minPos - 0.5))
      .attr("width", width)
      .attr("height", (d) => y(d.maxPos + 0.5) - y(d.minPos - 0.5))
      .attr("fill", (d) => d.color)
      .attr("opacity", 0.2);

    // X-axis
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
      .attr("y", 50)
      .attr("fill", "#333")
      .attr("font-size", "18px")
      .attr("font-family", "Formula1, sans-serif")
      .text("Race Round");

    // Y-axis
    g.append("g")
      .attr("class", "y-axis")
      .call(
        d3
          .axisLeft(y)
          .tickValues(d3.range(1, yDomainMax + 1, Math.ceil(yDomainMax / 10)))
          .tickFormat((d) =>
            d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : `${d}th`
          )
          .tickSize(-width)
          .tickPadding(10)
      )
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2 + 100)
      .attr("y", -50)
      .attr("fill", "#333")
      .attr("font-size", "18px")
      .attr("font-family", "Formula1, sans-serif")
      .text("Championship Position");

    // Style gridlines
    g.selectAll(".x-axis .tick line, .y-axis .tick line")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 0.5)
      .attr("stroke-dasharray", "2,2");

    // Remove axis borders
    g.selectAll(".x-axis .domain, .y-axis .domain").attr("stroke", "none");

    // Title
    svg
      .append("text")
      .attr("x", margin.left + width / 2)
      .attr("y", margin.top / 2 - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "28px")
      .attr("font-weight", "bold")
      .attr("font-family", "Formula1, sans-serif")
      .attr("fill", "#222")
      .attr("id", "chart-title")
      .text(`Championship Battle Trends - ${selectedSeason}`);

    // Legend
    const legendData = [
      { label: "Top Performers", color: "gold" },
      { label: "Midfield", color: "silver" },
      { label: "Backmarkers", color: "#cd7f32" },
    ];

    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(700, 50)`);

    const legendItems = legend
      .selectAll(".legend-item")
      .data(legendData)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", `translate(0, 0)`);

    legendItems
      .append("rect")
      .attr("x", 0)
      .attr("y", -7.5)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", (d) => d.color);

    const texts = legendItems
      .append("text")
      .attr("x", 20)
      .attr("y", 0)
      .attr("dy", "0.35em")
      .text((d) => d.label)
      .attr("font-size", "12px")
      .attr("font-family", "Formula1, sans-serif")
      .attr("fill", "#333");

    let currentX = 0;
    const gap = 20; // Gap between legend items
    legendItems.each(function(d, i) {
      const textWidth = texts.nodes()[i].getComputedTextLength();
      const itemWidth = 15 + 5 + textWidth;
      d3.select(this).attr("transform", `translate(${currentX}, 0)`);
      currentX += itemWidth + gap;
    });
    
      // Color scale
    const color = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain(seasonData.drivers.map((d) => d.driverId));

    // Lines group
    g.append("g")
      .attr("class", "lines")
      .selectAll("path")
      .data(seasonData.drivers)
      .enter()
      .append("path")
      .attr("class", (d) => `line line-${d.driverId}`)
      .attr("fill", "none")
      .attr("stroke", (d) => color(d.driverId))
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    // Labels group
    g.append("g").attr("class", "labels-end");

    // Tooltip
    d3.select("body")
      .selectAll(".tooltip")
      .data([0])
      .enter()
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
  }, [seasonData]);

  // Update chart on season change
  useEffect(() => {
    if (!seasonData) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select("g");
    const margin = { top: 80, right: 200, bottom: 80, left: 80 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    const yDomainMax = Math.max(seasonData.drivers.length, 20);

    const x = d3
      .scaleLinear()
      .domain([1, seasonData.races.length])
      .range([0, width]);
    const y = d3.scaleLinear().domain([1, yDomainMax]).range([0, height]);

    const color = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain(seasonData.drivers.map((d) => d.driverId));

    // Update title
    svg
      .select("#chart-title")
      .text(`Championship Battle Trends - ${selectedSeason}`);

    // Update lines
    const line = d3
      .line()
      .x((d, i) => x(i + 1))
      .y((d) => (d ? y(d) : null))
      .defined((d) => d !== null)
      .curve(d3.curveBumpX);

    const lines = g
      .select(".lines")
      .selectAll(".line")
      .data(seasonData.drivers)
      .join("path")
      .attr("class", (d) => `line line-${d.driverId}`)
      .attr("d", (d) => line(d.positions))
      .attr("stroke", (d) => color(d.driverId));

    // Animate lines
    lines.each(function () {
      const totalLength = this.getTotalLength();
      d3.select(this)
        .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(3000)
        .attr("stroke-dashoffset", 0);
    });

    // Update labels
    const labelOffset = 10;
    g.select(".labels-end")
      .selectAll(".label-end")
      .data(
        seasonData.drivers.filter(
          (d) => d.positions[d.positions.length - 1] !== null
        )
      )
      .join("text")
      .attr("class", "label-end")
      .attr("x", x(seasonData.races.length) + labelOffset)
      .attr("y", (d) => y(d.positions[d.positions.length - 1]))
      .attr("text-anchor", "start")
      .attr("dy", ".35em")
      .attr("font-size", "12px")
      .attr("font-family", "Formula1, sans-serif")
      .attr("fill", (d) => color(d.driverId))
      .text((d) => d.driverName)
      .style("opacity", 0)
      .transition()
      .duration(3000)
      .style("opacity", 1);

    // Mouse events
    g.selectAll(".line")
      .on("mouseover", (event, d) => {
        const [xPos] = d3.pointer(event);
        const raceRound = Math.round(x.invert(xPos));
        const position = d.positions[raceRound - 1];
        if (position !== null) {
          const race = seasonData.races[raceRound - 1];
          const raceName = race ? race.name : "";
          d3.select(".tooltip")
            .style("display", "block")
            .html(
              `
                <strong>${d.driverName}</strong><br>
                Race: ${raceName}<br>
                Race Round: ${raceRound}<br>
                Position: ${position}
              `
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 30}px`);
        }
      })
      .on("mouseout", () => d3.select(".tooltip").style("display", "none"));
  }, [selectedSeason, seasonData]);

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
            htmlFor="season-select"
            className="mt-5 block text-sm font-medium text-gray-700 font-[Formula1]"
          >
            Select Season:
          </label>
          <select
            id="season-select"
            value={selectedSeason || ""}
            onChange={(e) => setSelectedSeason(e.target.value)}
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
            {d3.range(2000, 2025).map((year) => (
              <option key={year} value={year.toString()}>
                {year}
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
            Track the intensity of the title fight race by race! This graph
            follows how the top drivers’ positions in the standings changed over
            the course of a season, showing key turning points and momentum
            shifts
          </h3>
        </div>
      </div>
    </div>
  );
};

export default ChampionshipBattleTrends;
