import { useEffect, useState, useRef } from 'react';
import { loadData } from '../../utils/data';  // must return drivers, driver_standings, results, races, constructors
import * as d3 from 'd3';

const CareerProgression = () => {
  const svgRef = useRef();

  const [driverData, setDriverData] = useState(null);
  const [driverIds, setDriverIds] = useState([]);
  const [startYear, setStartYear] = useState(1995);
  const [endYear, setEndYear] = useState(2024);
  const [selectedDriver, setSelectedDriver] = useState('none');

  useEffect(() => {
    loadData().then(({ drivers, driver_standings, results, races, constructors }) => {

      const filteredRaces = races.filter(r => +r.year >= 1950 && +r.year <= 2024);
      const raceMap = Object.fromEntries(filteredRaces.map(r => [r.raceId, r]));

      // indexing standings by driver-year
      const standingsByDY = {};
      driver_standings
        .filter(s => raceMap[s.raceId])
        .forEach(s => {
          const y = +raceMap[s.raceId].year;
          const key = `${s.driverId}-${y}`;
          (standingsByDY[key] ||= []).push(s);
        });

      // indexing results by driver-year
      const resultsByDY = {};
      results
        .filter(r => raceMap[r.raceId])
        .forEach(r => {
          const y = +raceMap[r.raceId].year;
          const key = `${r.driverId}-${y}`;
          (resultsByDY[key] ||= []).push(r);
        });

      // all unique driver IDs in that window
      const ids = Object.keys(standingsByDY)
        .map(k => k.split('-')[0])
        .filter((v,i,a) => a.indexOf(v) === i);
      setDriverIds(ids);

      // constructor lookup by id
      const consMap = Object.fromEntries(
        constructors.map(c => [c.constructorId, { name: c.name, ref: c.constructorRef }])
      );

      // build stats: one entry per driver+year
      const stats = [];
      ids.forEach(driverId => {
        for (let year = 1950; year <= 2024; year++) {
          const key = `${driverId}-${year}`;

          // final points
          const yearStandings = standingsByDY[key] || [];
          yearStandings.sort((a, b) =>
            +raceMap[a.raceId].round - +raceMap[b.raceId].round
          );
          const lastSt = yearStandings.pop();
          const points = lastSt ? +lastSt.points : 0;

          // first constructor
          const yearResults = resultsByDY[key] || [];
          const first = yearResults.length
            ? yearResults.reduce((best, r) => {
                const rd = +raceMap[r.raceId].round;
                return !best || rd < best.round
                  ? { round: rd, constructorId: r.constructorId }
                  : best;
              }, null)
            : null;
          const constructorId = first?.constructorId ?? null;

          stats.push({ driverId, year, points, constructorId });
        }
      });

      // assemble per-driver map
      const dataMap = {};
      drivers
        .filter(d => ids.includes(d.driverId.toString()))
        .forEach(d => {
          const yearsData = stats
            .filter(s => s.driverId === d.driverId)
            .sort((a, b) => a.year - b.year)
            .map(s => ({
              ...s,
              constructorRef: consMap[s.constructorId]?.ref || '',
              constructorName: consMap[s.constructorId]?.name || ''
            }));
          dataMap[d.driverId] = {
            name: `${d.forename} ${d.surname}`,
            yearsData
          };
        });
      setDriverData(ids);
      setDriverData({ drivers: dataMap });
    });
  }, []);

  // redraw chart when driver or years change
  useEffect(() => {
    if (!driverData || selectedDriver === 'none') return;

    const driverInfo = driverData.drivers[selectedDriver];
    if (!driverInfo) return;

    const data = driverInfo.yearsData.filter(d => d.year >= startYear && d.year <= endYear);
    if (!data.length) return;

    const idx = driverIds.indexOf(selectedDriver);
    const strokeColor = d3.interpolateRainbow(idx / driverIds.length);

    const teamColors = {
      '1': '#FF8700','131':'#C0C0C0','3':'#37A7D8','6':'#FF1801',
      '9':'#1B3F8B','214':'#0093C7','210':'#4B4B4B','51':'#960000',
      '213':'#F4F4F4','117':'#2D8265','4':'#000000','5':'#A39064',
      '10':'#00A85C','211':'#EC0374','15':'#DE3126','215':'#1A1F71'
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const margin = { top: 70, right: 100, bottom: 70, left: 70 };
    const width = +svg.attr('width') - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([startYear, endYear]).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.points)]).range([height, 0]);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')).tickSize(-height).tickPadding(10))
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', '#333')
      .attr('font-size', '16px')
      .attr('font-family', 'Arial, sans-serif')
      .text('Season');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickPadding(10))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2 + 50)
      .attr('y', -50)
      .attr('fill', '#333')
      .attr('font-size', '16px')
      .attr('font-family', 'Arial, sans-serif')
      .text('Points');

    g.selectAll('.tick line')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2');
    g.selectAll('.domain')
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5);

    svg.append('text')
      .attr('x', margin.left + width / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'Arial, sans-serif')
      .attr('fill', '#222')
      .text(`Career of ${driverInfo.name} (${startYear}–${endYear})`);

    const lineGen = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.points))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append('path')
      .datum(data)
      .attr('d', lineGen)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    const ptsG = g.append('g');
    ptsG.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.points))
      .attr('r', 6)
      .attr('fill', strokeColor)
      .attr('stroke', d => teamColors[d.constructorId] || '#000')
      .attr('stroke-width', 3);

    ptsG.selectAll('text')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.year))
      .attr('y', d => y(d.points) - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', d => teamColors[d.constructorId] || '#333')
      .text(d => d.constructorRef.toUpperCase());

    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', '#fff')
      .style('padding', '5px 10px')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('box-shadow', '0 2px 5px rgba(0,0,0,0.2)')
      .style('font-family', 'Arial, sans-serif')
      .style('font-size', '12px')
      .style('display', 'none');

    ptsG.selectAll('circle')
      .on('mouseover', (ev, d) => {
        tooltip
          .style('display', 'block')
          .html(`
            <strong style="color:${strokeColor}">${driverInfo.name}</strong><br/>
            Season: ${d.year}<br/>
            Points: ${d.points}<br/>
            Constructor: ${d.constructorName}
          `)
          .style('left', `${ev.pageX + 10}px`)
          .style('top', `${ev.pageY - 30}px`);
      })
      .on('mouseout', () => tooltip.style('display', 'none'));

  }, [driverData, driverIds, selectedDriver, startYear, endYear]);

  // years dropdown options
  const yearOptions = d3.range(1950, 2025);

  // sorted drivers alphabetically
  const sortedDrivers = driverData
    ? Object.entries(driverData.drivers).sort(([,a],[,b]) => a.name.localeCompare(b.name))
    : [];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#f5f5f5',
        padding: '40px 0'
      }}
    >
      {/* CONTROLS */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        {/* Start Year */}
        <div>
          <label htmlFor="start-year" style={{ display: 'block', marginBottom: '4px', fontFamily:'Arial, sans-serif' }}>
            Start Year
          </label>
          <select
            id="start-year"
            value={startYear}
            onChange={e => {
              const v = +e.target.value;
              setStartYear(v);
              if (v > endYear) setEndYear(v);
            }}
            style={{
              padding: '8px',
              fontFamily: 'Arial, sans-serif',
              borderRadius: '4px',
              border: '1px solid #ccc',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '80px'
            }}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* End Year */}
        <div>
          <label htmlFor="end-year" style={{ display: 'block', marginBottom: '4px', fontFamily:'Arial, sans-serif' }}>
            End Year
          </label>
          <select
            id="end-year"
            value={endYear}
            onChange={e => setEndYear(+e.target.value)}
            style={{
              padding: '8px',
              fontFamily: 'Arial, sans-serif',
              borderRadius: '4px',
              border: '1px solid #ccc',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '80px'
            }}
          >
            {yearOptions.filter(y => y >= startYear).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Driver Selector */}
        <div>
          <label htmlFor="driver-select" style={{ display: 'block', marginBottom: '4px', fontFamily:'Arial, sans-serif' }}>
            Select Driver
          </label>
          <select
            id="driver-select"
            value={selectedDriver}
            onChange={e => setSelectedDriver(e.target.value)}
            style={{
              padding: '8px',
              fontFamily: 'Arial, sans-serif',
              borderRadius: '4px',
              border: '1px solid #ccc',
              outline: 'none',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="none" disabled>— choose a driver —</option>
            {sortedDrivers.map(([id, info]) => (
              <option key={id} value={id}>{info.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CHART */}
      <div
        style={{
          width: '1000px',
          maxWidth: '100%',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          background: '#fff',
          padding: '16px'
        }}
      >
        <svg
          ref={svgRef}
          width="1000"
          height="500"
          style={{
            display: 'block',
            margin: '0 auto',
            background: 'transparent'
          }}
        />
      </div>
    </div>
  );
};

export default CareerProgression;
