import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { loadData } from "../../utils/data";

const DriverContributions2 = () => {
  const svgRef = useRef();
  const arcRef = useRef();
  const [data, setData] = useState(null);
  const [selectedYear, setSelectedYear] = useState("2024");
  const [selectedConstructor, setSelectedConstructor] = useState("9");
  const [years, setYears] = useState([]);
  const [constructors, setConstructors] = useState([]);

  const teamColors = {
    1: "#FF8700", // McLaren
    6: "#FF1801", // Ferrari
    9: "#1B3F8B", // Red Bull
    131: "#A7A7A7", // Mercedes
    3: "#37A7D8", // Williams
    214: "#0093C7", // Alpine
    210: "#4B4B4B", // Haas
    51: "#960000", // Alfa Romeo
    213: "#20394C", // AlphaTauri
    117: "#2D8265", // Aston Martin
    4: "#000000", // Renault
    5: "#A39064", // Toro Rosso
    10: "#00A85C", // Force India
    211: "#EC0374", // Racing Point
    15: "#DE3126", // Sauber
    215: "#1A1F71", // RB
  };

  const getLuminance = (color) => {
    const rgb = d3.rgb(color);
    return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  };

  useEffect(() => {
    loadData().then(({ races, constructors, drivers, results }) => {
      const filteredRaces = races.filter(
        (r) => +r.year >= 2014 && +r.year <= 2024
      );
      const years = [...new Set(filteredRaces.map((r) => +r.year))].sort();
      setYears(years);

      const driverContributions = {};
      const constructorParticipation = {};

      years.forEach((year) => {
        constructorParticipation[year] = new Set();
        const yearRaces = filteredRaces
          .filter((r) => +r.year === year)
          .map((r) => r.raceId);
        const yearResults = results.filter((r) => yearRaces.includes(r.raceId));

        yearResults.forEach((r) => {
          constructorParticipation[year].add(r.constructorId);
        });

        constructors.forEach((c) => {
          driverContributions[c.constructorId] =
            driverContributions[c.constructorId] || {};
          const constructorResults = yearResults.filter(
            (r) => r.constructorId === c.constructorId
          );
          const totalPoints = d3.sum(constructorResults, (r) => +r.points);
          const driverPoints = {};

          constructorResults.forEach((r) => {
            if (!driverPoints[r.driverId]) {
              const driver = drivers.find((d) => d.driverId === r.driverId);
              driverPoints[r.driverId] = {
                name: driver
                  ? `${driver.forename} ${driver.surname}`
                  : "Unknown",
                points: 0,
              };
            }
            driverPoints[r.driverId].points += +r.points;
          });

          driverContributions[c.constructorId][year] = Object.entries(
            driverPoints
          ).map(([driverId, data]) => ({
            driverId,
            name: data.name,
            points: data.points,
            percentage: totalPoints > 0 ? (data.points / totalPoints) * 100 : 0,
          }));
        });
      });

      const updateConstructors = (year) => {
        const activeConstructors = constructors.filter((c) =>
          constructorParticipation[year]?.has(c.constructorId)
        );
        setConstructors(activeConstructors);
        if (
          !activeConstructors.some(
            (c) => c.constructorId === selectedConstructor
          )
        ) {
          setSelectedConstructor("none");
        }
      };

      setData(driverContributions);
      updateConstructors(selectedYear);
    });
  }, [selectedYear]);

  useEffect(() => {
    if (!data || selectedConstructor === "none") return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 700;
    const height = 700;
    const outerRadius = 220;
    const innerRadius = 100;

    arcRef.current = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const contributionData = data[selectedConstructor][selectedYear] || [];
    if (contributionData.length === 0) return;

    contributionData.sort((a, b) => b.points - a.points);

    const pie = d3
      .pie()
      .sort(null)
      .value((d) => d.percentage);

    const baseColor = teamColors[selectedConstructor] || "#666";
    const colorScale = d3
      .scaleLinear()
      .domain([0, d3.max(contributionData, (d) => d.points) || 1])
      .range([d3.color(baseColor).brighter(2), baseColor]);

    const defs = svg.append("defs");
    contributionData.forEach((d, i) => {
      const gradient = defs
        .append("linearGradient")
        .attr("id", `gradient-${selectedConstructor}-${i}`)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "100%");
      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(d.points));
      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d3.color(colorScale(d.points)).darker(0.5));
    });

    const arcs = g
      .selectAll(".arc")
      .data(pie(contributionData))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs
      .append("path")
      .attr("fill", (d, i) => `url(#gradient-${selectedConstructor}-${i})`)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))")
      .each(function (d) {
        this._current = d;
      })
      .transition()
      .duration(750)
      .attrTween("d", function (d) {
        const i = d3.interpolate(
          { startAngle: d.startAngle, endAngle: d.startAngle },
          d
        );
        return (t) => arcRef.current(i(t));
      });

    arcs
      .append("text")
      .attr("transform", (d) => {
        const [x, y] = arcRef.current.centroid(d);
        return `translate(${x}, ${y})`;
      })
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-family", "Formula1, sans-serif")
      .attr("fill", (d) =>
        getLuminance(colorScale(d.data.points)) > 128 ? "#000" : "#fff"
      )
      .selectAll("tspan")
      .data((d) => [
        d.data.name.split(" ")[1],
        `${d.data.points} pts`,
        `(${d.data.percentage.toFixed(1)}%)`,
      ])
      .enter()
      .append("tspan")
      .attr("x", 0)
      .attr("dy", (d, i) => (i === 0 ? "-1.2em" : "1.2em"))
      .text((d) => d)
      .style("opacity", 0)
      .transition()
      .duration(750)
      .delay(500)
      .style("opacity", 1);

    const constructorName =
      constructors.find((c) => c.constructorId === selectedConstructor)?.name ||
      "Unknown";

    g.append("text")
      .attr("x", width / 2)
      .attr("y", height - 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "24px")
      .attr("font-family", "Formula1, sans-serif")
      .attr("font-weight", "bold")
      .attr("fill", baseColor)
      .text(constructorName)
      .style("opacity", 0)
      .transition()
      .duration(750)
      .delay(750)
      .style("opacity", 1);

    const treadGroup = g.append("g").attr("class", "tread-pattern");

    const treadRadius = outerRadius + 15;
    const treadCount = 30;
    for (let i = 0; i < treadCount; i++) {
      const angle = (i / treadCount) * 2 * Math.PI;
      const grooveAngle = angle + Math.PI / 6;
      treadGroup
        .append("line")
        .attr("x1", Math.cos(angle) * outerRadius)
        .attr("y1", Math.sin(angle) * outerRadius)
        .attr("x2", Math.cos(grooveAngle) * treadRadius)
        .attr("y2", Math.sin(grooveAngle) * treadRadius)
        .attr("stroke", "#222")
        .attr("stroke-width", 3)
        .attr("stroke-linecap", "round")
        .style("opacity", 0)
        .transition()
        .duration(750)
        .delay(250)
        .style("opacity", 1);
    }

    const caliperGroup = g.append("g").attr("class", "caliper");

    caliperGroup
      .append("rect")
      .attr("x", -50)
      .attr("y", -30)
      .attr("width", 100)
      .attr("height", 60)
      .attr("rx", 10)
      .attr("fill", "url(#caliper-gradient)")
      .attr("stroke", "#333")
      .attr("stroke-width", 2)
      .style("opacity", 0)
      .transition()
      .duration(750)
      .delay(500)
      .style("opacity", 1);

    caliperGroup
      .append("circle")
      .attr("cx", -30)
      .attr("cy", 0)
      .attr("r", 10)
      .attr("fill", "#666")
      .style("opacity", 0)
      .transition()
      .duration(750)
      .delay(600)
      .style("opacity", 1);

    caliperGroup
      .append("circle")
      .attr("cx", 30)
      .attr("cy", 0)
      .attr("r", 10)
      .attr("fill", "#666")
      .style("opacity", 0)
      .transition()
      .duration(750)
      .delay(600)
      .style("opacity", 1);

    defs
      .append("linearGradient")
      .attr("id", "caliper-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%")
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#999" },
        { offset: "100%", color: "#666" },
      ])
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    return () => {
      arcs.each(function (d) {
        this._current = d;
      });
    };
  }, [data, selectedYear, selectedConstructor]);

  useEffect(() => {
    if (!data || selectedConstructor === "none") return;

    const svg = d3.select(svgRef.current);
    const arcs = svg.selectAll(".arc");

    arcs.each(function (d) {
      const arcPath = d3.select(this).select("path");
      const i = d3.interpolate(this._current, d);
      arcPath
        .transition()
        .duration(750)
        .attrTween("d", () => (t) => arcRef.current(i(t)));
      this._current = d;
    });
  }, [selectedYear, selectedConstructor]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="flex flex-col items-center">
        <div className="flex space-x-4 mb-4">
          <div>
            <label
              htmlFor="year-select"
              className="block text-sm font-medium text-gray-700 font-[Formula1]"
            >
              Select Year:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="mt-1 block w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-[Formula1]"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="constructor-select"
              className="block text-sm font-medium text-gray-700 font-[Formula1]"
            >
              Select Constructor:
            </label>
            <select
              id="constructor-select"
              value={selectedConstructor}
              onChange={(e) => setSelectedConstructor(e.target.value)}
              className="mt-1 block w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-[Formula1]"
            >
              <option value="none">Select a Constructor</option>
              {constructors.map((c) => (
                <option key={c.constructorId} value={c.constructorId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col" style={{ maxWidth: "700px" }}>
          <svg
            ref={svgRef}
            width="700"
            height="700"
            className="bg-white rounded-lg shadow-lg"
          ></svg>
          <h3 className="font-[Formula1] mt-5 justify-center text-center">
            How much did each driver contribute to their team’s success? This
            visualization breaks down the share of points scored by each
            teammate — revealing team dynamics and standout individual efforts.
          </h3>
        </div>
      </div>
    </div>
  );
};

export default DriverContributions2;
