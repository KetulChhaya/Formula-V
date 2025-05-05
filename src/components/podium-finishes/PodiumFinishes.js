import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Dropdown from "../utils/Dropdown";
import { loadData } from "../../utils/data";

async function getSunburstPodiumData() {
  const { drivers, results, races } = await loadData();

  const raceMap = new Map(races.map((r) => [r.raceId, r]));
  const driverMap = new Map(
    drivers.map((d) => [d.driverId, `${d.forename} ${d.surname}`])
  );

  const podiumResults = results.filter(
    (r) => r.positionOrder >= 1 && r.positionOrder <= 3
  );

  const hierarchy = {};

  for (const res of podiumResults) {
    const driverName = driverMap.get(res.driverId) || "Unknown";
    const position = `P${res.positionOrder}`;
    const race = raceMap.get(res.raceId);
    const raceYear = parseInt(race?.year, 10);
    if (raceYear < 2014) continue;
    const raceLabel = `${race?.year} ${race?.name}`;

    if (!hierarchy[driverName]) hierarchy[driverName] = {};
    if (!hierarchy[driverName][position]) hierarchy[driverName][position] = [];

    hierarchy[driverName][position].push({ name: raceLabel, value: 1 });
  }

  const sunburstData = {
    name: "Podiums",
    children: Object.entries(hierarchy).map(([driver, positions]) => ({
      name: driver,
      children: Object.entries(positions).map(([pos, races]) => ({
        name: pos,
        children: races,
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
  const [selectedPositions, setSelectedPositions] = useState([
    "P1",
    "P2",
    "P3",
  ]);

  const width = 900;

  // Define points for each podium position
  const pointsMap = {
    P1: 25,
    P2: 18,
    P3: 15,
  };

  // Helper function to extract year from race name
  const getYearFromRaceName = (raceName) => {
    const parts = raceName.split(" ");
    return parseInt(parts[0], 10);
  };

  // Helper function to get all races under a node recursively
  const getAllRaces = (node) => {
    if (!node.children) return [node];
    return node.children.flatMap((child) => getAllRaces(child));
  };

  // Helper function to filter node by year recursively
  const filterNodeByYear = (node, year) => {
    if (!node.children) {
      const raceYear = getYearFromRaceName(node.name);
      return raceYear === year ? node : null;
    }
    const filteredChildren = node.children
      .map((child) => filterNodeByYear(child, year))
      .filter(Boolean);
    return filteredChildren.length > 0
      ? { ...node, children: filteredChildren }
      : null;
  };

  // First useEffect: Load full data and extract years
  useEffect(() => {
    (async () => {
      const data = await getSunburstPodiumData();
      if (!data || !data.children) return;

      setAllData(data);

      const yearSet = new Set();
      data.children.forEach((driver) => {
        driver.children.forEach((positionNode) => {
          getAllRaces(positionNode).forEach((race) => {
            const year = getYearFromRaceName(race.name);
            if (year) yearSet.add(year);
          });
        });
      });

      const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
      setYears(sortedYears.map((y) => ({ value: y, label: y })));
      setSelectedYear(sortedYears[0]);
    })();
  }, []);

  // Second useEffect: Filter data based on selected year and top 3 drivers
  useEffect(() => {
    if (!allData || !selectedYear) return;

    // Calculate points for each driver in the selected year
    const driverPoints = allData.children.map((driver) => {
      let totalPoints = 0;
      driver.children.forEach((positionNode) => {
        debugger
        const position = positionNode.name;
        const points = pointsMap[position] || 0;
        const racesInYear = getAllRaces(positionNode).filter(
          (race) => getYearFromRaceName(race.name) === selectedYear
        );
        totalPoints += points * racesInYear.length;
      });
      return { name: driver.name, points: totalPoints };
    });

    // Sort and get top 3 drivers
    driverPoints.sort((a, b) => b.points - a.points);
    const topDrivers = driverPoints.slice(0, 3).map((dp) => dp.name);

    // Filter allData to include only top drivers and their races in the selected year
    const filteredDrivers = allData.children
      .filter((driver) => topDrivers.includes(driver.name))
      .map((driver) => {
        const filteredPositions = driver.children
          .map((positionNode) => filterNodeByYear(positionNode, selectedYear))
          .filter(Boolean);
        return filteredPositions.length > 0
          ? { name: driver.name, children: filteredPositions }
          : null;
      })
      .filter(Boolean);

    setData({ name: "Podiums", children: filteredDrivers });
  }, [allData, selectedYear]);

  useEffect(() => {
    if (!allData || !selectedYear) return;

    const filteredData = {
      name: "Podiums",
      children: allData.children
        .map((driver) => {
          const filteredPositions = driver.children
            ?.filter((pos) => selectedPositions.includes(pos.name))
            .map((pos) => {
              const filteredRaces = pos.children?.filter((r) =>
                r.name.startsWith(selectedYear)
              );
              return filteredRaces?.length
                ? { name: pos.name, children: filteredRaces }
                : null;
            })
            .filter(Boolean);

          return filteredPositions?.length
            ? { name: driver.name, children: filteredPositions }
            : null;
        })
        .filter(Boolean),
    };

    console.log("Filtered Data:", filteredData);

    setData(filteredData);
  }, [allData, selectedYear, selectedPositions]);

  useEffect(() => {
    if (!data) return;

    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", [-width / 2, -width / 2, width, width])
      .style("font", "10px 'Formula1', sans-serif");

    svg.selectAll("*").remove();

    const root = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);

    const maxDepth = root.height;
    const partition = d3.partition().size([2 * Math.PI, maxDepth + 1]);
    partition(root);

    const radius = width / 2 / (maxDepth + 1);

    const arc = d3
      .arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

    const color = d3
      .scaleOrdinal()
      .domain(root.children.map((d) => d.data.name))
      .range(
        d3.quantize(d3.interpolateRainbow, root.children.length + 1).slice(1)
      );

    root.each((d) => (d.current = d));

    const g = svg.append("g");

    const path = g
      .selectAll("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", (d) => {
        let node = d;
        while (node.depth > 1) node = node.parent;
        return color(node.data.name);
      })
      .attr("fill-opacity", (d) =>
        arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0
      )
      .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"))
      .attr("d", (d) => arc(d.current));

    path
      .filter((d) => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);

    const format = d3.format(",d");
    path.append("title").text(
      (d) =>
        `${d
          .ancestors()
          .map((d) => d.data.name)
          .reverse()
          .join("/")}\n${format(d.value)}`
    );

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
      .attr("font-size", (d) => (d.depth === maxDepth ? "8px" : "10px"))
      .text((d) => d.data.name.replace(/^\d{4}\s*/, ""));

    const parent = svg
      .append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

    function clicked(event, p) {
      parent.datum(p.parent || root);

      root.each(
        (d) =>
          (d.target = {
            x0:
              Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
              2 *
              Math.PI,
            x1:
              Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
              2 *
              Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth),
          })
      );

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
        .attr("fill-opacity", (d) =>
          arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0
        )
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
      return (
        d.y1 <= maxDepth + 1 &&
        d.y0 >= 0 &&
        (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03
      );
    }

    function labelTransform(d) {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const y = ((d.y0 + d.y1) / 2) * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
  }, [data]);

  return (
    <div className="max-w-7xl mx-auto flex flex-row gap-8 items-start p-6">
      {/* Left Panel: Filters */}
      <div className="flex flex-col gap-4 w-[250px]">
        <h2 className="text-xl font-bold text-gray-800 font-[Formula1]">Podium Finishes</h2>

        <Dropdown
          options={years}
          selectedOption={selectedYear}
          onSelect={setSelectedYear}
        />
      </div>

      {/* Right Panel: SVG */}
      <div className="flex-1">
        <svg ref={svgRef} width={width} height={width}></svg>
      </div>
    </div>
  );
};

export default PodiumSunburst;
