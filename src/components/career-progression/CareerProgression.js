import { useEffect, useState, useRef } from 'react';
import { loadData } from '../../utils/data';
import * as d3 from 'd3';

const CareerProgression = () => {
  const svgRef = useRef();

  // processed data
  const [driverData, setDriverData] = useState(null);
  const [driverIds, setDriverIds] = useState([]);

  // UI
  const [selectedDriver, setSelectedDriver] = useState(null);

  // 1) load & preprocess once
  useEffect(() => {
    loadData().then(({ drivers, driver_standings, results, races, constructors }) => {
      // restrict to seasons 1995–2024
      const filteredRaces = races.filter(r => +r.year >= 1995 && +r.year <= 2024);
      const raceMap = Object.fromEntries(filteredRaces.map(r => [r.raceId, r]));

      // index standings & results by driver–year
      const standingsByDY = {};
      driver_standings
        .filter(s => raceMap[s.raceId])
        .forEach(s => {
          const y = +raceMap[s.raceId].year;
          (standingsByDY[`${s.driverId}-${y}`] ||= []).push(s);
        });

      const resultsByDY = {};
      results
        .filter(r => raceMap[r.raceId])
        .forEach(r => {
          const y = +raceMap[r.raceId].year;
          (resultsByDY[`${r.driverId}-${y}`] ||= []).push(r);
        });

      // collect all driver IDs
      const ids = Array.from(
        new Set(Object.keys(standingsByDY).map(k => k.split('-')[0]))
      );
      setDriverIds(ids);

      // constructor lookup
      const consMap = Object.fromEntries(
        constructors.map(c => [c.constructorId, { name: c.name, ref: c.constructorRef }])
      );

      // build per-driver, per-year stats
      const stats = [];
      ids.forEach(driverId => {
        for (let year = 1995; year <= 2024; year++) {
          const key = `${driverId}-${year}`;
          // final points
          const stRows = (standingsByDY[key] || []).sort((a,b)=>
            +raceMap[a.raceId].round - +raceMap[b.raceId].round
          );
          const last = stRows.pop();
          const points = last ? +last.points : 0;
          // first constructor
          const resRows = resultsByDY[key] || [];
          const first = resRows.length
            ? resRows.reduce((best, r) => {
                const rd = +raceMap[r.raceId].round;
                return !best || rd < best.round
                  ? { round: rd, constructorId: r.constructorId }
                  : best;
              }, null)
            : null;
          stats.push({
            driverId,
            year,
            points,
            constructorId: first?.constructorId ?? null
          });
        }
      });

      // assemble per‑driver timeseries
      const dataMap = {};
      drivers
        .filter(d => ids.includes(d.driverId.toString()))
        .forEach(d => {
          const yearsData = stats
            .filter(s => s.driverId === d.driverId)
            .sort((a,b) => a.year - b.year)
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

      setDriverData({ drivers: dataMap });

      // default to Lewis Hamilton if present
      const h = Object.entries(dataMap).find(([,info]) => info.name === 'Lewis Hamilton');
      setSelectedDriver(h ? h[0] : ids[0]);
    });
  }, []);

  // 2) redraw whenever selection changes
  useEffect(() => {
    if (!driverData || !selectedDriver) return;
    const info = driverData.drivers[selectedDriver];
    if (!info) return;

    // only the years they actually raced
    const data = info.yearsData.filter(d => d.constructorRef);
    if (!data.length) return;

    // span
    const years = data.map(d => d.year);
    const minYear = d3.min(years);
    const maxYear = d3.max(years);

    // choose color
    const idx = driverIds.indexOf(selectedDriver);
    const strokeColor = d3.interpolateRainbow(idx / driverIds.length);

    // constructor borders
    const teamColors = {
      '1': '#FF8700','131':'#C0C0C0','3':'#37A7D8','6':'#FF1801',
      '9':'#1B3F8B','214':'#0093C7','210':'#4B4B4B','51':'#960000',
      '213':'#F4F4F4','117':'#2D8265','4':'#000000','5':'#A39064',
      '10':'#00A85C','211':'#EC0374','15':'#DE3126','215':'#1A1F71'
    };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const margin = { top: 70, right: 20, bottom: 70, left: 70 };
    const width  = +svg.attr('width')  - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top  - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // x-domain
    let x0 = minYear, x1 = maxYear;
    if (x0 === x1) { x0 -= 0.5; x1 += 0.5; }
    const x = d3.scaleLinear().domain([x0, x1]).range([0, width]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.points)]).nice()
      .range([height, 0]);

    // axes + grid
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')).tickSize(-height).tickPadding(10))
      .append('text')
      .attr('x', width/2).attr('y', 40)
      .attr('fill','#333').attr('font-size','16px').attr('font-family','Formula1, sans-serif')
      .text('Season');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickPadding(10))
      .append('text')
      .attr('transform','rotate(-90)').attr('x', -height/2+50).attr('y', -50)
      .attr('fill','#333').attr('font-size','16px').attr('font-family','Formula1, sans-serif')
      .text('Points');

    g.selectAll('.domain').remove();
    g.selectAll('.tick line')
      .attr('stroke','#e0e0e0').attr('stroke-dasharray','2,2');

    // title
    svg.append('text')
      .attr('x', margin.left + width/2)
      .attr('y', margin.top/2)
      .attr('text-anchor','middle')
      .attr('font-size','24px').attr('font-weight','bold')
      .attr('font-family','Formula1, sans-serif').attr('fill','#222')
      .text(`Career of ${info.name} (${minYear}–${maxYear})`);

    // line generator
    const lineGen = d3.line()
      .x(d => x(d.year)).y(d => y(d.points))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // append path with dash-array trick for reveal animation
    const path = g.append('path')
      .datum(data)
      .attr('d', lineGen)
      .attr('fill','none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 3)
      .style('filter','drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    // animate the stroke drawing
    const totalLength = path.node().getTotalLength();
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(3000)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);

    // draw points + constructor borders + labels
    const ptsG = g.append('g');
    ptsG.selectAll('circle')
      .data(data).enter().append('circle')
      .attr('cx', d=>x(d.year)).attr('cy', d=>y(d.points))
      .attr('r', 6)
      .attr('fill', strokeColor)
      .attr('stroke', d=>teamColors[d.constructorId]||'#000')
      .attr('stroke-width', 3);

    ptsG.selectAll('text')
      .data(data).enter().append('text')
      .attr('x', d=>x(d.year)).attr('y', d=>y(d.points)-10)
      .attr('text-anchor','middle').attr('font-size','10px')
      .attr('fill', d=>teamColors[d.constructorId]||'#333')
      .text(d=>d.constructorRef.toUpperCase());

    // tooltip
    const tooltip = d3.select('body').append('div').attr('class','tooltip')
      .style('position','absolute').style('background','#fff')
      .style('padding','5px 10px').style('border','1px solid #ccc')
      .style('border-radius','4px').style('box-shadow','0 2px 5px rgba(0,0,0,0.2)')
      .style('font-family','Formula1, sans-serif').style('font-size','12px')
      .style('display','none');

    ptsG.selectAll('circle')
      .on('mouseover',(ev,d)=>{
        tooltip.style('display','block')
          .html(`
            <strong style="color:${strokeColor}">${info.name}</strong><br/>
            Season: ${d.year}<br/>
            Points: ${d.points}<br/>
            Constructor: ${d.constructorName}
          `)
          .style('left',`${ev.pageX+10}px`)
          .style('top',`${ev.pageY-30}px`);
      })
      .on('mouseout',() => tooltip.style('display','none'));

  }, [driverData, driverIds, selectedDriver]);

  // sorted dropdown: only career-start ≥ 2000
  const sortedDrivers = driverData
    ? Object.entries(driverData.drivers)
        .map(([id,info]) => {
          const first = info.yearsData.find(d => d.constructorRef)?.year || Infinity;
          return { id, name: info.name, start: first };
        })
        .filter(d => d.start >= 2000)
        .sort((a,b) => a.name.localeCompare(b.name))
    : [];

  return (
    <div style={{
      display:'flex', justifyContent:'center', alignItems:'center',
      height:'100vh', background:'#f5f5f5'
    }}>
      <div style={{ display:'flex', alignItems:'flex-start' }}>
        {/* driver selector */}
        <div style={{ marginRight:'20px', marginTop:'10px' }}>
          <label htmlFor="driver-select"
                  className="mt-5 block text-sm font-medium text-gray-700 font-[Formula1]"
          >
            Select Driver:
          </label>
          <select
            id="driver-select"
            value={selectedDriver||''}
            onChange={e=>setSelectedDriver(e.target.value)}
            className="mt-1 block w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-[Formula1]"
            onFocus={e=>{
              e.target.style.borderColor='#4682b4';
              e.target.style.boxShadow='0 0 5px rgba(70,130,180,0.5)';
            }}
            onBlur={e=>{
              e.target.style.borderColor='#ccc';
              e.target.style.boxShadow='inset 0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <option value="" disabled>— choose a driver —</option>
            {sortedDrivers.map(d=>(
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        {/* chart */}
        <svg
          ref={svgRef}
          width="1100"
          height="600"
          style={{
            background:'#fff',
            borderRadius:'8px',
            boxShadow:'0 4px 12px rgba(0,0,0,0.1)'
          }}
        />
      </div>
    </div>
  );
};

export default CareerProgression;
