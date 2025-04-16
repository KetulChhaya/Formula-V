// src/components/viz2/Viz2.js
import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import { loadData } from '../../utils/data';

const Viz2 = () => {
  const svgRef = useRef();
  const [races, setRaces] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [qualifying, setQualifying] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedRace, setSelectedRace] = useState(null);

  const width = 1000;
  const height = 800;

  useEffect(() => {
    loadData().then(({ races, drivers, qualifying, results }) => {
      setRaces(races.slice(0, 20));
      setDrivers(drivers);
      setQualifying(qualifying);
      setResults(results);
    });
  }, []);

  useEffect(() => {
    if (!selectedRace || qualifying.length === 0 || results.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const qualMap = new Map();
    qualifying.forEach(q => {
      if (q.raceId === selectedRace) qualMap.set(q.driverId, +q.position);
    });

    const resultMap = new Map();
    results.forEach(r => {
      if (r.raceId === selectedRace) resultMap.set(r.driverId, +r.positionOrder);
    });

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
      .filter(r => r.raceId === selectedRace)
      .forEach(r => {
        const driverId = r.driverId;
        const qualPos = qualMap.get(driverId);
        const finalPos = resultMap.get(driverId);
        if (!qualPos || !finalPos) return;

        const source = addNode(`Q${qualPos}`);
        const target = addNode(`P${finalPos}`);

        // links.push({
        //   source,
        //   target,
        //   value: 1,
        //   driverId
        // });

        links.push({
            source: `Q${qualPos}`,
            target: `P${finalPos}`,
            value: 1,
            driverId
          });
      });

    //   const sortByRank = name => {
    //     const rank = name.slice(1); // removes 'Q' or 'P'
    //     return parseInt(rank, 10);
    //   };
      
    //   nodes.sort((a, b) => sortByRank(a.name) - sortByRank(b.name));

    //   nodes.sort((a, b) => {
    //     const isQualA = a.name.startsWith('Q');
    //     const isQualB = b.name.startsWith('Q');
      
    //     if (isQualA && !isQualB) return -1;
    //     if (!isQualA && isQualB) return 1;
      
    //     return parseInt(a.name.slice(1)) - parseInt(b.name.slice(1));
    //   });

    

      const sankeyLayout = sankey()
      .nodeId(d => d.name)
      .nodeAlign(sankeyJustify)
      .nodeWidth(60)
      .nodePadding(10)
      .nodeSort((a, b) => {
        const getRank = d => parseInt(d.name.slice(1), 10);
        return getRank(a) - getRank(b);
      })
      .extent([[1, 1], [width - 1, height - 6]]);
    
    const graph = sankeyLayout({
      nodes: nodes.map(d => ({ ...d })),
      links: links.map(d => ({ ...d }))
    });

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const driverMap = new Map(drivers.map(d => [d.driverId, `${d.forename} ${d.surname}`]));

    const tooltip = d3.select('body')
      .append('div')
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('padding', '6px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('visibility', 'hidden');

    // Links with variable height
    svg.append('g')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', d => color(d.driverId))
      .attr('stroke-width', d => Math.max(1, d.width))
      .attr('opacity', 0.7)
      .on('mouseover', (event, d) => {
        tooltip.html(
          `<strong>${driverMap.get(d.driverId)}</strong><br/>From ${d.source.name} → ${d.target.name}`
        )
        .style('top', `${event.pageY - 10}px`)
        .style('left', `${event.pageX + 10}px`)
        .style('visibility', 'visible');
      })
      .on('mousemove', (event) => {
        tooltip.style('top', `${event.pageY - 10}px`).style('left', `${event.pageX + 10}px`);
      })
      .on('mouseout', () => tooltip.style('visibility', 'hidden'))
      .transition()
      .duration(1500)
      .attrTween("stroke-dasharray", function() {
        const length = this.getTotalLength();
        return d3.interpolate(`0,${length}`, `${length},${length}`);
      });

    // Nodes
    svg.append('g')
      .selectAll('rect')
      .data(graph.nodes)
      .join('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', '#333')
      .append('title')
      .text(d => d.name);

    // Node labels
    svg.append('g')
      .selectAll('text')
      .data(graph.nodes)
      .join('text')
      .attr('x', d => d.x0 - 6)
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text(d => d.name)
      .attr('fill', 'black');

  }, [selectedRace, qualifying, results, drivers]);

  return (
    <div>
      <h2>Qualifying to Final Position Sankey Diagram</h2>
      <label>Select Race: </label>
      <select onChange={e => setSelectedRace(e.target.value)}>
        <option value="">-- Select --</option>
        {races.map(r => (
          <option key={r.raceId} value={r.raceId}>
            {r.name} ({r.year})
          </option>
        ))}
      </select>
      <svg ref={svgRef} width={width} height={height}></svg>
    </div>
  );
};

export default Viz2;