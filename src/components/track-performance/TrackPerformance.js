import { useEffect, useState, useRef } from "react";
import { loadData } from "../../utils/data";
import * as d3 from "d3";

const TrackPerformance = () => {
  const svgRef = useRef();

  // stash raw lookups
  const refs = useRef({
    raceMap: null,
    validRaceIds: null,
    circuitMap: null,
    fullResults: null,
    driverMap: null,
  });

  // processed: trackId → { name, performance }
  const [trackData, setTrackData] = useState(null);
  const [trackIds, setTrackIds] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);

  // default metric = average
  const [metric, setMetric] = useState("avg");

  // 1) load & preprocess once
  useEffect(() => {
    loadData().then(({ drivers, results, races, circuits, constructors }) => {
      // only 2014–2024
      const validRaceIds = new Set(
        races
          .filter((r) => +r.year >= 2014 && +r.year <= 2024)
          .map((r) => r.raceId)
      );
      const raceMap = Object.fromEntries(
        races.map((r) => [r.raceId, r.circuitId])
      );
      const circuitMap = Object.fromEntries(
        circuits.map((c) => [c.circuitId, c.name])
      );
      const driverMap = Object.fromEntries(
        drivers.map((d) => [d.driverId, `${d.forename} ${d.surname}`])
      );

      refs.current = {
        raceMap,
        validRaceIds,
        circuitMap,
        fullResults: results,
        driverMap,
      };

      // aggregate sum & count by circuit + driver
      const agg = {};
      results.forEach((r) => {
        if (!validRaceIds.has(r.raceId)) return;
        const cId = raceMap[r.raceId];
        agg[cId] ||= {};
        agg[cId][r.driverId] ||= { sum: 0, count: 0 };
        agg[cId][r.driverId].sum += +r.points;
        agg[cId][r.driverId].count += 1;
      });

      // build top-10 per track
      const td = {};
      Object.entries(agg).forEach(([cId, byDrv]) => {
        const perf = Object.entries(byDrv)
          .map(([dId, { sum, count }]) => ({
            driverId: dId,
            driverName: driverMap[dId],
            sum,
            count,
            avg: sum / count,
          }))
          .filter((d) => d.sum > 0)
          .sort((a, b) => b.avg - a.avg) // sort by average points
          .slice(0, 10);
        td[cId] = { name: circuitMap[cId], performance: perf };
      });

      const ids = Object.keys(td).sort((a, b) =>
        td[a].name.localeCompare(td[b].name)
      );
      setTrackData(td);
      setTrackIds(ids);
      setSelectedTrack(ids[0]);
    });
  }, []);

  // 2) render pie
  useEffect(() => {
    if (!trackData || !selectedTrack) return;
    const { name, performance } = trackData[selectedTrack];
    if (!performance.length) return;
    const data = performance;

    // clear
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = +svg.attr("width"),
      H = +svg.attr("height");
    const margin = { top: 60, right: 200, bottom: 40, left: 40 };
    const width = W - margin.left - margin.right;
    const height = H - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;

    const g = svg
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left + width / 2},${margin.top + height / 2})`
      );

    // choose metric accessor
    const valueFn = metric === "avg" ? (d) => d.avg : (d) => d.sum;

    // scales & generators
    const color = d3
      .scaleOrdinal(d3.schemeCategory10)
      .domain(data.map((d) => d.driverName));
    const pieGen = d3.pie().value(valueFn).sort(null);
    const arcGen = d3.arc().innerRadius(0).outerRadius(radius);

    // tooltip
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
      .style("font-size", "12px")
      .style("display", "none");

    // main pie with 3s reveal
    g.selectAll("path.slice")
      .data(pieGen(data))
      .enter()
      .append("path")
      .attr("class", "slice")
      .attr("fill", (d) => color(d.data.driverName))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .each(function (d) {
        this._current = { startAngle: 0, endAngle: 0 };
      })
      .on("mouseover", (e, d) => {
        tooltip
          .style("display", "block")
          .html(
            `
            <strong>${d.data.driverName}</strong><br/>
            Total: ${d.data.sum.toFixed(0)} pts<br/>
            Races: ${d.data.count}<br/>
            Avg: ${d.data.avg.toFixed(2)}
          `
          )
          .style("left", `${e.pageX + 10}px`)
          .style("top", `${e.pageY + 10}px`);
      })
      .on("mouseout", () => tooltip.style("display", "none"))
      .transition()
      .duration(3000)
      .attrTween("d", function (d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(1);
        return (t) => arcGen(i(t));
      });

    // title
    svg
      .append("text")
      .attr("x", W / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .attr("font-family", "Formula1, sans-serif")
      .attr("font-weight", "bold")
      .attr("font-size", "20px")
      .text(`Top 10 Drivers at ${name} (2014–2024)`);

    // vertical legend
    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${margin.left + width + 20},${margin.top})`
      );
    legend
      .selectAll("g")
      .data(data)
      .enter()
      .append("g")
      .attr("transform", (_, i) => `translate(0, ${i * 20})`)
      .call((g) => {
        g.append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("fill", (d) => color(d.driverName));
        g.append("text")
          .attr("x", 18)
          .attr("y", 10)
          .attr("font-family", "Formula1, sans-serif")
          .attr("font-size", "12px")
          .text((d) => d.driverName);
      });
  }, [trackData, selectedTrack, metric]);

  // dropdowns
  const trackOptions = trackData
    ? trackIds.map((id) => ({ id, name: trackData[id].name }))
    : [];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "#f5f5f5",
        padding: "40px",
      }}
    >
      <div style={{ marginRight: "20px" }}>
        <label
          htmlFor="track-select"
          className="block text-sm font-medium text-gray-700 font-[Formula1]"
        >
          Select Track:
        </label>
        <select
          id="track-select"
          value={selectedTrack || ""}
          onChange={(e) => setSelectedTrack(e.target.value)}
          className="mt-1 block w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-[Formula1]"
        >
          {trackOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        <label
          htmlFor="metric-select"
          className="mt-5 block text-sm font-medium text-gray-700 font-[Formula1]"
        >
          Compare By:
        </label>
        <select
          id="metric-select"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          className="mt-1 block w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-[Formula1]"
        >
          <option value="avg">Average Points</option>
          <option value="sum">Total Points</option>
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
        />
        <h3 className="font-[Formula1] mt-5 justify-center text-center">
          Which tracks bring out the best in each driver? This pie chart shows
          how many points a driver earned at each circuit, highlighting their
          most successful venues and favorite hunting grounds.
        </h3>
      </div>
    </div>
  );
};

export default TrackPerformance;
