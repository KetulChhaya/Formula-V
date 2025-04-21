import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import { loadData } from "../../utils/data";
import Dropdown from "../utils/Dropdown";
import { constructorColors } from "../../utils/generateColorPallete";

const constructorColorMap = new Map();

const QualifyToFinalPosition = () => {
  const svgRef = useRef();
  const [races, setRaces] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [qualifying, setQualifying] = useState([]);
  const [results, setResults] = useState([]);
  const [constructors, setConstructors] = useState([]);
  const [selectedRace, setSelectedRace] = useState("1121");
  const [selectedRaceLabel, setSelectedRaceLabel] = useState("Bahrain Grand Prix (2024)");
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("2024");
  const [allRaces, setAllRaces] = useState([]);

  const width = 1600;
  const height = 950;

  useEffect(() => {
    loadData().then(({ races, drivers, qualifying, results, constructors }) => {
      console.log("Races", races);
      const defaultYearRaces = races.filter((r) => r.year === selectedYear);
      setRaces(defaultYearRaces);

      // Suppose you have a list of constructors
      constructors.forEach((name, index) => {
        constructorColorMap.set(name.constructorId, constructorColors[index]);
      });

      console.log("Constructors", constructorColorMap);

      // Extract unique years from races
      const uniqueYears = Array.from(new Set(races.map((r) => r.year))).sort(
        (a, b) => b - a
      );
      setAllRaces(races);
      setYears(uniqueYears);
      setDrivers(drivers);
      setQualifying(qualifying);
      setResults(results);
      setConstructors(constructors);

      console.log("Constructors Length", constructors.length, constructors);
    });
  }, []);

  useEffect(() => {
    if (!selectedRace || qualifying.length === 0 || results.length === 0)
      return;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height + 80);
    svg.selectAll("*").remove();

    const qualMap = new Map();
    qualifying.forEach((q) => {
      if (q.raceId === selectedRace) qualMap.set(q.driverId, +q.position);
    });

    const resultMap = new Map();
    results.forEach((r) => {
      if (r.raceId === selectedRace)
        resultMap.set(r.driverId, +r.positionOrder);
    });

    const constructorMap = new Map();
    results.forEach((r) => {
      if (r.raceId === selectedRace)
        constructorMap.set(r.driverId, r.constructorId);
    });

    const constructorNameMap = new Map(
      constructors.map((c) => [
        c.constructorId,
        c.name.toLowerCase().replace(/\s+/g, "_"),
      ])
    );

    console.log(constructorNameMap);

    const links = [];
    const nodes = [];
    const nodeMap = new Map();

    const addNode = (name) => {
      if (!nodeMap.has(name)) {
        nodeMap.set(name, nodes.length);
        nodes.push({ name });
      }
      return nodeMap.get(name);
    };

    results
      .filter((r) => r.raceId === selectedRace)
      .forEach((r) => {
        const driverId = r.driverId;
        const qualPos = qualMap.get(driverId);
        const finalPos = resultMap.get(driverId);
        if (!qualPos || !finalPos) return;

        const source = addNode(`Q${qualPos}`);
        const target = addNode(`P${finalPos}`);

        links.push({
          source: `Q${qualPos}`,
          target: `P${finalPos}`,
          value: 10,
          driverId,
          constructorId: constructorMap.get(driverId),
        });
      });

    const sankeyLayout = sankey()
      .nodeId((d) => d.name)
      .nodeAlign(sankeyJustify)
      .nodeWidth(60)
      .nodePadding(5)
      .nodeSort((a, b) => {
        const getRank = (d) => parseInt(d.name.slice(1), 10);
        return getRank(a) - getRank(b);
      })
      .extent([
        [1, 30],
        [width - 1, height - 6],
      ]);

    const graph = sankeyLayout({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    });

    graph.nodes.forEach((node) => {
      node.y1 = node.y0 + 50;
    });

    const driverMap = new Map(
      drivers.map((d) => [d.driverId, `${d.forename} ${d.surname}`])
    );

    // Create driverId -> driverName map
    const driverNameMap = new Map();
    graph.links.forEach((link) => {
      if (link.driverId && link.target?.name) {
        driverNameMap.set(link.target.name, link.driverId);
      }
    });

    // Create node name -> constructorId map (for team logos)
    const teamMap = new Map();
    graph.links.forEach((link) => {
      if (link.constructorId && link.source?.name) {
        teamMap.set(link.source.name, link.constructorId);
      }
    });
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "6px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

    svg
      .append("g")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const constructorName = constructorNameMap.get(d.constructorId);
        return constructorColorMap.get(d.constructorId) || "#888";
      })
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .attr("opacity", 0.7)
      .on("mouseover", (event, d) => {
        tooltip
          .html(
            `<strong>${driverMap.get(d.driverId)}</strong><br/>From ${
              d.source.name
            } → ${d.target.name}<br/>
            - ${constructorNameMap
              .get(d.constructorId)
              .replace("_", " ")
              .split(" ")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              )
              .join(" ")}`
          )
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`)
          .style("visibility", "visible");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"))
      .transition()
      .duration(1500)
      .attrTween("stroke-dasharray", function () {
        const length = this.getTotalLength();
        return d3.interpolate(`0,${length}`, `${length},${length}`);
      });

    svg
      .append("g")
      .selectAll("rect")
      .data(graph.nodes)
      .join("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .attr("fill", "#333")
      .append("title")
      .text((d) => d.name);

    svg
      .append("g")
      .selectAll("text.position-on-node")
      .data(graph.nodes)
      .join("text")
      .attr("class", "position-on-node")
      .attr("x", (d) => (d.x0 + d.x1) / 2)
      .attr("y", (d) => (d.y0 + d.y1) / 2)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .attr("font-size", 10)
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text((d) => d.name);

    const qNodes = graph.nodes.filter((d) => d.name.startsWith("Q"));
    console.log("Qualifying nodes for logo:", qNodes);

    svg
      .append("g")
      .selectAll("image.left-logo")
      .data(qNodes)
      .join("image")
      .attr("class", "left-logo")
      .attr(
        "xlink:href",
        "https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg?cs=srgb&dl=pexels-souvenirpixels-414612.jpg&fm=jpg"
      )
      .attr("x", (d) => d.x0 - 40)
      .attr("y", (d) => (d.y0 + d.y1) / 2 - 10)
      .attr("width", 20)
      .attr("height", 20);

    // Node labels - Positions
    svg
      .append("g")
      .selectAll("text")
      .data(graph.nodes)
      .join("text")
      .attr("x", (d) => d.x0 - 6)
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.1em")
      .attr("text-anchor", "end")
      .text((d) => {
        const link = graph.links.find((l) => l.target.name === d.name);
        if (!link) return "";
        const constructorId = link.constructorId;
        const constructorName = constructorNameMap
          .get(constructorId)
          .replace("_", " ")
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ");

        return constructorName;
      })
      .attr("fill", "white")
      .attr("font-size", 14)
      .attr("text-transform", "capitalize");

    svg
      .append("g")
      .selectAll("text")
      .data(graph.nodes)
      .join("text")
      .attr("x", (d) => d.x1 + 10)
      .attr("y", (d) => (d.y0 + d.y1) / 2)
      .attr("dy", "0.1em")
      .attr("text-anchor", "start")
      .attr("font-size", 14)
      .attr("fill", "#fff")
      .text((d) => {
        const link = graph.links.find((l) => l.source.name === d.name);
        if (!link) return "";
        const driverId = link.source.sourceLinks[0].driverId;
        const driverName = driverMap.get(driverId);
        return driverName || "";
      });

    svg
      .append("g")
      .selectAll("text.caption-label")
      .data([
        { text: "QP", x: graph.nodes[0].x0 + 40, anchor: "end" },
        { text: "Driver", x: graph.nodes[0].x0 + 80, anchor: "start" },
        { text: "Constructor", x: graph.nodes[0].x0 + 1450, anchor: "start" },
        { text: "FP", x: 1560 },
      ])
      .join("text")
      .attr("class", "caption-label")
      .attr("x", (d) => d.x)
      .attr("y", 20)
      .attr("text-anchor", (d) => d.anchor)
      .attr("fill", "#555")
      .attr("font-size", 14)
      .attr("font-weight", "600")
      .text((d) => d.text);

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .attr("font-weight", "bold")
      .attr("fill", "#000")
      .text(`${selectedRaceLabel.toUpperCase()}`);
  }, [selectedRace, qualifying, results, drivers, constructors]);

  const raceOptions = races.map((r) => ({
    value: r.raceId,
    label: `${r.name} (${r.year})`,
  }));

  return (
    <div>
      <div className="max-w-7xl m-auto mt-10">
        <h2 className="h2 font-sans text-2xl font-bold text-slate-950">
          🥇 Where You Start Isn’t Always Where You Finish
        </h2>
        <div className="flex justify-start gap-10">
          <div className="my-2 flex items-center gap-2">
            <label className="text-xl">Select Year: </label>
            <Dropdown
              options={years.map((y) => ({ value: y, label: y }))}
              onSelect={(year) => {
                setSelectedYear(year);
                const filtered = allRaces.filter((r) => r.year === year);
                setRaces(filtered);
                setSelectedRace(null);
              }}
              selectedOption={selectedYear}
            />
          </div>
          <div className="my-2 flex items-center gap-2">
            <label className="my-5 text-xl">Select Race: </label>
            <Dropdown
              options={raceOptions}
              onSelect={(raceId) => {
                setSelectedRace(raceId);
                const rLabel = raceOptions.find((r) => r.value === raceId).label;
                setSelectedRaceLabel(rLabel);
              }}
              selectedRaceLabel={selectedRaceLabel}
              selectedOption={selectedRace}
            />
          </div>
        </div>
      </div>
      <div className="w-full m-auto text-center flex justify-center">
        <svg ref={svgRef} width={width} height={height}></svg>
      </div>
    </div>
  );
};

export default QualifyToFinalPosition;
