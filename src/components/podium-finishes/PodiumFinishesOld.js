import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Dropdown from "../utils/Dropdown";
import { loadData } from "../../utils/data";

async function getSunburstPodiumData() {
  const { drivers, results, races, circuits, constructors } = await loadData();

  const raceMap = new Map(races.map((r) => [r.raceId, r]));
  const circuitMap = new Map(circuits.map((c) => [c.circuitId, c]));
  const driverMap = new Map(drivers.map((d) => [d.driverId, { name: `${d.forename} ${d.surname}`, constructorId: null }]));
  const constructorMap = new Map(constructors.map((c) => [c.constructorId, c.name]));

  const podiumResults = results.filter((r) => r.positionOrder >= 1 && r.positionOrder <= 3);

  for (const res of podiumResults) {
    if (driverMap.has(res.driverId)) {
      driverMap.get(res.driverId).constructorId = res.constructorId;
    }
  }

  const hierarchy = {};

  for (const res of podiumResults) {
    const driver = driverMap.get(res.driverId) || { name: "Unknown", constructorId: null };
    const driverName = driver.name;
    const position = `P${res.positionOrder}`;
    const race = raceMap.get(res.raceId);
    const circuit = circuitMap.get(race?.circuitId);
    const country = circuit?.country || "Unknown";
    const raceLabel = `${race?.year} ${race?.name}`;
    const raceType = race?.name.includes("Grand Prix") ? "Grand Prix" : "Other";

    if (!hierarchy[driverName]) hierarchy[driverName] = { constructorId: driver.constructorId, races: {} };
    if (!hierarchy[driverName].races[position]) hierarchy[driverName].races[position] = {};
    if (!hierarchy[driverName].races[position][country]) hierarchy[driverName].races[position][country] = {};

    if (!hierarchy[driverName].races[position][country][raceType]) {
      hierarchy[driverName].races[position][country][raceType] = [];
    }

    hierarchy[driverName].races[position][country][raceType].push({ name: raceLabel, value: 1 });
  }

  const sunburstData = {
    name: "Podiums",
    children: Object.entries(hierarchy).map(([driver, data]) => ({
      name: driver,
      constructorId: data.constructorId,
      children: Object.entries(data.races).map(([pos, countries]) => ({
        name: pos,
        children: Object.entries(countries).map(([country, raceTypes]) => ({
          name: country,
          children: Object.entries(raceTypes).map(([raceType, races]) => ({
            name: raceType,
            children: races,
          })),
        })),
      })),
    })),
  };

  return sunburstData;
}

const PodiumSunburst = () => {
  const svgRef = useRef();
  const [data, setData] = useState(null);
  const [allData, setAllData] = useState(null);
  const [selectedYear, setSelectedYear] = useState("2024");
  const [years, setYears] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState(["P1", "P2", "P3"]);
  const [constructors, setConstructors] = useState([]);

  const width = 900;

  useEffect(() => {
    (async () => {
      const { constructors } = await loadData();
      setConstructors(constructors);

      const data = await getSunburstPodiumData();
      if (!data || !data.children) return;

      const topDrivers = data.children
        .map(driver => ({
          name: driver.name,
          total: driver.children?.flatMap(p => p.children || []).flatMap(c => c.children || []).flatMap(r => r.children || []).length || 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(d => d.name);

      const filteredChildren = data.children.filter(d => topDrivers.includes(d.name));
      const topDriverData = { name: "Podiums", children: filteredChildren };

      setAllData(topDriverData);

      const yearSet = new Set();
      topDriverData.children.forEach((driver) => {
        driver.children?.forEach((pos) => {
          pos.children?.forEach((country) => {
            country.children?.forEach((raceType) => {
              raceType.children?.forEach((race) => {
                const year = race.name.split(" ")[0];
                if (!isNaN(year)) yearSet.add(year);
              });
            });
          });
        });
      });

      const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
      setYears(sortedYears.map((y) => ({ value: y, label: y })));
      setSelectedYear((prev) => prev || sortedYears[0]);
    })();
  }, []);

  useEffect(() => {
    if (!allData || !selectedYear) return;

    const filteredData = {
      name: "Podiums",
      children: allData.children
        .map((driver) => {
          const filteredPositions = driver.children
            ?.filter((pos) => selectedPositions.includes(pos.name))
            .map((pos) => {
              const filteredCountries = pos.children?.map((country) => {
                const filteredRaceTypes = country.children?.map((raceType) => {
                  const filteredRaces = raceType.children?.filter((r) =>
                    r.name.startsWith(selectedYear)
                  );
                  return filteredRaces?.length
                    ? { name: raceType.name, children: filteredRaces }
                    : null;
                }).filter(Boolean);

                return filteredRaceTypes?.length
                  ? { name: country.name, children: filteredRaceTypes }
                  : null;
              }).filter(Boolean);

              return filteredCountries?.length
                ? { name: pos.name, children: filteredCountries }
                : null;
            }).filter(Boolean);

          return filteredPositions?.length
            ? { name: driver.name, constructorId: driver.constructorId, children: filteredPositions }
            : null;
        })
        .filter(Boolean),
    };

    setData(filteredData);
  }, [allData, selectedYear, selectedPositions]);

  useEffect(() => {
    if (!data) return;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [-width / 2, -width / 2, width, width])
      .style("font", "10px 'Roboto', sans-serif")
      .style("filter", "drop-shadow(0 0 10px rgba(0,0,0,0.1))");

    svg.selectAll("*").remove();

    const root = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);

    const maxDepth = root.height;
    const partition = d3.partition().size([2 * Math.PI, maxDepth + 1]);
    partition(root);

    const radius = (width / 2) / (maxDepth + 1);

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

    const teamColors = {
      "Mercedes": "#00D2BE",
      "Ferrari": "#DC0000",
      "Red Bull Racing": "#1E41FF",
      "McLaren": "#FF8700",
      "Aston Martin": "#00644B",
      "Alpine": "#0090FF",
      "Williams": "#005AFF",
      "Racing Bulls": "#FFFFFF",
      "Haas": "#FFFFFF",
      "Kick Sauber": "#00FF00",
    };

    const color = d3.scaleOrdinal()
      .domain(Object.keys(teamColors))
      .range(Object.values(teamColors))
      .unknown(() => d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, root.children.length + 1)));

    const constructorMap = new Map(constructors.map((c) => [c.constructorId, c.name]));
    const getTeamColor = (d) => {
      if (d.depth === 1) {
        const constructorId = d.data.constructorId;
        const constructorName = constructorMap.get(constructorId) || "Unknown";
        return teamColors[constructorName] || color(constructorName);
      }
      return teamColors[d.parent.data.name] || color(d.parent.data.name);
    };

    root.each((d) => (d.current = d));

    const g = svg.append("g");

    const path = g
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", (d) => getTeamColor(d))
      .attr("fill-opacity", (d) => (arcVisible(d.current) ? (d.children ? 0.7 : 0.5) : 0))
      .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"))
      .attr("d", (d) => arc(d.current));

    path.filter((d) => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);

    const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

    path
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill-opacity", 0.9);
        let tooltipHtml = "";
        if (d.depth === 1) {
          const constructorId = d.data.constructorId;
          const constructorName = constructorMap.get(constructorId) || "Unknown";
          const totalPodiums = d.children?.flatMap(p => p.children || []).flatMap(c => c.children || []).flatMap(r => r.children || []).length || 0;
          tooltipHtml = `<strong>${d.data.name}</strong><br>Team: ${constructorName}<br>Total Podiums: ${totalPodiums}<br>Notable: ${d.data.name === "Lewis Hamilton" ? "7x World Champion" : "F1 Legend"}`;
        } else if (d.depth === 2) {
          tooltipHtml = `<strong>${d.data.name}</strong><br>Driver: ${d.parent.data.name}`;
        } else if (d.depth === 3) {
          tooltipHtml = `<strong>${d.data.name}</strong><br>Position: ${d.parent.data.name}<br>Driver: ${d.parent.parent.data.name}`;
        } else {
          tooltipHtml = `<strong>${d.data.name}</strong><br>Type: ${d.parent.data.name}<br>Country: ${d.parent.parent.data.name}`;
        }
        tooltip
          .html(tooltipHtml)
          .style("visibility", "visible")
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function () {
        d3.select(this).attr("fill-opacity", (d) => (arcVisible(d.current) ? (d.children ? 0.7 : 0.5) : 0));
        tooltip.style("visibility", "hidden");
      });

    const label = g
      .append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll("text")
      .data(root.descendants().slice(1))
      .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", (d) => +labelVisible(d.current))
      .attr("transform", (d) => labelTransform(d.current))
      .attr("font-size", (d) => d.depth === maxDepth ? "8px" : "10px")
      .text((d) => d.data.name);

    const parent = svg
      .append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

    const legend = svg.append("g")
      .attr("transform", `translate(${width / 2 - 100}, ${width / 2 - 50})`)
      .attr("font-family", "Roboto")
      .attr("font-size", "12px");

    const legendItems = Object.entries(teamColors);
    legendItems.forEach(([team, color], i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);

      legendRow.append("rect")
        .attr("x", -80)
        .attr("y", -8)
        .attr("width", 16)
        .attr("height", 16)
        .attr("fill", color);

      legendRow.append("text")
        .attr("x", -60)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .text(team);
    });

    function clicked(event, p) {
      parent.datum(p.parent || root);

      root.each((d) => (d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth),
      }));

      const t = g.transition().duration(750);

      path
        .transition(t)
        .tween("data", (d) => {
          const i = d3.interpolate(d.current, d.target);
          return (t) => (d.current = i(t));
        })
        .filter(function (d) {
          return +this.getAttribute("fill-opacity") || arcVisible(d.target);
        })
        .attr("fill-opacity", (d) => (arcVisible(d.target) ? (d.children ? 0.7 : 0.5) : 0))
        .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
        .attrTween("d", (d) => () => arc(d.current));

      label
        .filter(function (d) {
          return +this.getAttribute("fill-opacity") || labelVisible(d.target);
        })
        .transition(t)
        .attr("fill-opacity", (d) => +labelVisible(d.target))
        .attrTween("transform", (d) => () => labelTransform(d.current));
    }

    function arcVisible(d) {
      return d.y1 <= maxDepth + 1 && d.y0 >= 0 && d.x1 > d.x0;
    }

    function labelVisible(d) {
      return d.y1 <= maxDepth + 1 && d.y0 >= 0 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d) {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const y = ((d.y0 + d.y1) / 2) * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

    return () => {
      tooltip.remove();
    };
  }, [data, constructors]);

  return (
    <div className="bg-white">

      <h2 className="text-3xl font-bold text-gray-800">Formula 1 Podium Finishes</h2>
      <div className="flex gap-4">
        <div className="relative">
          <Dropdown
            options={years}
            selectedOption={selectedYear}
            onSelect={setSelectedYear}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
          />
        </div>
        <div className="flex gap-2">
          {["P1", "P2", "P3"].map((pos) => (
            <label key={pos} className="flex items-center text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={selectedPositions.includes(pos)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSelectedPositions((prev) =>
                    checked ? [...prev, pos] : prev.filter((p) => p !== pos)
                  );
                }}
                className="mr-2 accent-blue-500"
              />
              {pos}
            </label>
          ))}
        </div>
      </div>
      <svg ref={svgRef} width={width} height={width}></svg>
    </div>
  );
};

export default PodiumSunburst;