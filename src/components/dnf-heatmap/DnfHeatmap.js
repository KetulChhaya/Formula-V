import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { loadData } from "../../utils/data";

const DnfHeatmap = () => {
  const svgRef = useRef();
  const [heatmapData, setHeatmapData] = useState(null);
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedConstructors, setSelectedConstructors] = useState(["All"]);
  const [years, setYears] = useState([]);
  const [constructors, setConstructors] = useState([]);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [isConstructorDropdownOpen, setIsConstructorDropdownOpen] =
    useState(false);
  const width = 1100;
  const height = 600;
  const margin = { top: 50, right: 20, bottom: 20, left: 200 };

  useEffect(() => {
    loadData().then(({ races, results, constructors, status }) => {
      // Filter races from 2014 onwards
      const filteredRaces = races.filter((r) => parseInt(r.year) >= 2014);
      const raceIds = new Set(filteredRaces.map((r) => r.raceId));
      const filteredResults = results.filter((r) => raceIds.has(r.raceId));

      const activeConstructorIds = new Set(
        filteredResults.map((r) => r.constructorId)
      );
      const activeConstructors = constructors.filter((c) =>
        activeConstructorIds.has(c.constructorId)
      );

      const dnfStatusIds = new Set(
        status
          .filter(
            (s) => !s.status.includes("Finished") && !s.status.includes("Lap")
          )
          .map((s) => s.statusId)
      );

      const dnfData = {};
      filteredResults.forEach((result) => {
        const year = filteredRaces.find((r) => r.raceId === result.raceId).year;
        const constructorId = result.constructorId;
        const statusId = result.statusId;

        if (!dnfData[year]) dnfData[year] = {};
        if (!dnfData[year][constructorId]) {
          dnfData[year][constructorId] = { total: 0, dnf: 0, reasons: {} };
        }

        dnfData[year][constructorId].total += 1;
        if (dnfStatusIds.has(statusId)) {
          dnfData[year][constructorId].dnf += 1;
          const reason = status.find((s) => s.statusId === statusId).status;
          dnfData[year][constructorId].reasons[reason] =
            (dnfData[year][constructorId].reasons[reason] || 0) + 1;
        }
      });

      const uniqueYears = Array.from(
        new Set(filteredRaces.map((r) => r.year))
      ).sort();
      const constructorNames = new Map(
        activeConstructors.map((c) => [c.constructorId, c.name])
      );

      const heatmapCells = [];
      activeConstructors.forEach((constructor) => {
        const constructorId = constructor.constructorId;
        uniqueYears.forEach((year) => {
          const data = dnfData[year]?.[constructorId] || {
            total: 0,
            dnf: 0,
            reasons: {},
          };
          const rate = data.total > 0 ? data.dnf / data.total : 0;
          heatmapCells.push({
            constructorId,
            constructorName: constructorNames.get(constructorId),
            year,
            rate,
            dnf: data.dnf,
            total: data.total,
            reasons: data.reasons,
          });
        });
      });

      setHeatmapData({
        cells: heatmapCells,
        years: uniqueYears,
        constructorNames,
      });
      setYears([
        { value: "All", label: "All Years" },
        ...uniqueYears.map((y) => ({ value: y, label: y })),
      ]);
      setConstructors([
        { value: "All", label: "All Constructors" },
        ...activeConstructors.map((c) => ({
          value: c.constructorId,
          label: c.name,
        })),
      ]);
    });
  }, []);

  useEffect(() => {
    if (!heatmapData) return;

    const { cells, years, constructorNames } = heatmapData;

    const filteredCells = cells.filter(
      (d) =>
        (selectedYear === "All" || d.year.toString() === selectedYear) &&
        (selectedConstructors.includes("All") ||
          selectedConstructors.includes(d.constructorId))
    );

    const constructorAvgDnf = Array.from(constructorNames.entries())
      .map(([id, name]) => {
        const constructorCells = filteredCells.filter(
          (c) => c.constructorId === id
        );
        const avgRate =
          constructorCells.length > 0
            ? d3.mean(constructorCells, (c) => c.rate)
            : 0;
        return { id, name, avgRate };
      })
      .sort((a, b) => b.avgRate - a.avgRate);
    const sortedConstructorNames = constructorAvgDnf.map((c) => c.name);

    filteredCells.sort((a, b) => b.rate - a.rate);

    const filteredYears = selectedYear === "All" ? years : [selectedYear];
    const filteredConstructorNames = selectedConstructors.includes("All")
      ? sortedConstructorNames
      : selectedConstructors.map((id) => constructorNames.get(id));

    if (!svgRef.current) return;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxRate = d3.max(cells, (d) => d.rate) || 1;
    const colorScale = d3
      .scaleSequential((t) =>
        //   t === 0 ? "transparent" : d3.interpolateReds(t)
        d3.interpolateReds(t)
      )
      .domain([0, maxRate]);

    const legendWidth = 20;
    const legendHeight = height - margin.top - margin.bottom - 50;
    const legendScale = d3
      .scaleLinear()
      .domain([0, maxRate])
      .range([legendHeight, 0]);
    const legendAxis = d3
      .axisLeft(legendScale)
      .ticks(5)
      .tickFormat((d) => `${(d * 100).toFixed(0)}%`);

    const legendG = svg
      .append("g")
      .attr("transform", `translate(${margin.left - 140},${margin.top})`);

    const defs = svg.append("defs");
    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("y1", "100%")
      .attr("x2", "0%")
      .attr("y2", "0%");

    const gradientStops = 10;
    for (let i = 0; i <= gradientStops; i++) {
      const t = i / gradientStops;
      linearGradient
        .append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorScale(t * maxRate));
    }
    legendG
      .append("rect")
      .attr("x", -legendWidth)
      .attr("y", 0)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("fill", "url(#legend-gradient)");

    legendG
      .append("g")
      .call(legendAxis)
      .selectAll("text")
      .attr("fill", "#fff")
      .attr("x", -legendWidth - 8)
      .attr("font-size", "12px")
      .attr("font-family", "Formula1, sans-serif");

    legendG
      .append("text")
      .attr("x", -legendWidth / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("font-family", "Formula1, sans-serif")
      .text("DNF Rate");

    const xScale = d3
      .scaleBand()
      .domain(filteredYears.map(String))
      .range([0, width - margin.left - margin.right])
      .padding(0);

    const yScale = d3
      .scaleBand()
      .domain(filteredConstructorNames)
      .range([0, height - margin.top - margin.bottom])
      .padding(0);

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-family", "Formula1, sans-serif")
      .style("visibility", "hidden");

    console.log("Filtered Cells:", filteredCells);

    g.selectAll("rect")
      .data(filteredCells)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.year.toString()))
      .attr("y", (d) => yScale(d.constructorName.toString()))
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) => colorScale(d.rate))
      .on("mouseover", (event, d) => {
        let html =
          `<strong>${d.constructorName} (${d.year})</strong><br>` +
          `DNF Rate: ${(d.rate * 100).toFixed(2)}%<br>` +
          `Total Races: ${d.total}<br>` +
          `DNFs: ${d.dnf}`;
        if (d.dnf > 0) {
          const reasonsHtml = Object.entries(d.reasons)
            .map(
              ([reason, count]) =>
                `${reason}: ${((count / d.dnf) * 100).toFixed(2)}% (${count})`
            )
            .join("<br>");
          html += `<br><strong>DNF Reasons:</strong><br>${reasonsHtml}`;
        }
        tooltip
          .html(html)
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`)
          .style("visibility", "visible");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", `${event.pageY - 10}px`)
          .style("cursor", "pointer")
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"))
      .transition()
      .duration(1000)
      .attr("opacity", 0)
      .transition()
      .duration(500)
      .attr("opacity", 1);

    g.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("font-family", "Formula1, sans-serif");

    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .attr("fill", "#fff")
      .attr("font-size", "12px")
      .attr("font-family", "Formula1, sans-serif");

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .attr("font-size", "18px")
      .attr("font-weight", "bold")
      .attr("font-family", "Formula1, sans-serif")
      .text("Did Not Finish (DNF) Rates by Constructor and Year (2014 - 2024)");
  }, [heatmapData, selectedYear, selectedConstructors]);

  const handleConstructorSelect = (constructorId) => {
    if (constructorId === "All") {
      setSelectedConstructors(["All"]);
    } else {
      const current = selectedConstructors.includes("All")
        ? []
        : [...selectedConstructors];
      if (current.includes(constructorId)) {
        setSelectedConstructors(current.filter((id) => id !== constructorId));
      } else {
        setSelectedConstructors([...current, constructorId]);
      }
    }
    setIsConstructorDropdownOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto mt-10 p-6 bg-gray-900 rounded-lg mb-8">
      <style>{`
        .checkered-bg {
          background-image: linear-gradient(45deg, #000 25%, transparent 25%),
                            linear-gradient(-45deg, #000 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #000 75%),
                            linear-gradient(-45deg, transparent 75%, #000 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          opacity: 1;
        }
        .tooltip {
          position: absolute;
          background: #fff;
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          pointer-events: none;
          visibility: hidden;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .dropdown {
          position: relative;
          display: inline-block;
        }
        .dropdown-button {
          background: #4a5568;
          color: white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        .dropdown-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background: #4a5568;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10;
          width: 200px;
          max-height: 200px;
          overflow-y: auto;
        }
        .dropdown-item {
          padding: 8px 16px;
          color: white;
          cursor: pointer;
        }
        .dropdown-item:hover {
          background: #718096;
        }
        .checkbox {
          margin-right: 8px;
        }
      `}</style>
      <div className="checkered-bg p-4 rounded-lg">
        <div className="flex justify-start gap-6 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-white text-lg font-[Formula1]">
              Select Year:
            </label>
            <div className="dropdown">
              <div
                className="dropdown-button font-[Formula1]"
                onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
              >
                {years.find((y) => y.value === selectedYear)?.label ||
                  "Select Year"}
              </div>
              {isYearDropdownOpen && (
                <div className="dropdown-menu">
                  {years.map((year) => (
                    <div
                      key={year.value}
                      className="dropdown-item"
                      onClick={() => {
                        setSelectedYear(year.value);
                        setIsYearDropdownOpen(false);
                      }}
                    >
                      {year.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-white text-lg">Select Constructors:</label>
            <div className="dropdown">
              <div
                className="dropdown-button"
                onClick={() =>
                  setIsConstructorDropdownOpen(!isConstructorDropdownOpen)
                }
              >
                {selectedConstructors.includes("All")
                  ? "All Constructors"
                  : selectedConstructors
                      .map(
                        (id) => constructors.find((c) => c.value === id)?.label
                      )
                      .join(", ") || "Select Constructors"}
              </div>
              {isConstructorDropdownOpen && (
                <div className="dropdown-menu">
                  {constructors.map((constructor) => (
                    <div
                      key={constructor.value}
                      className="dropdown-item"
                      onClick={() => handleConstructorSelect(constructor.value)}
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedConstructors.includes(
                          constructor.value
                        )}
                        readOnly
                      />
                      {constructor.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div
          className="flex flex-col justify-center"
          style={{ maxWidth: "1100px" }}
        >
          <div className="flex justify-center">
            <svg ref={svgRef}></svg>
          </div>
        </div>
      </div>
          <h3 className="font-[Formula1] mt-5 justify-center text-center text-white">
            Reliability matters. This heatmap shows how often each team failed
            to finish races (DNFs) across different seasons. It’s a window into
            mechanical struggles and how dependable (or not) each constructor
            was.
          </h3>
    </div>
  );
};

export default DnfHeatmap;
