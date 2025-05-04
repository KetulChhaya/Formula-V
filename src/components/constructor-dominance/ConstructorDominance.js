import { useEffect, useState, useRef } from 'react';
import { loadData } from '../../utils/data';
import * as d3 from 'd3';

const ConstructorDominance = () => {
    const svgRef = useRef();
    const [races, setRaces] = useState([]);
    const [constructors, setConstructors] = useState([]);
    const [results, setResults] = useState([]);
    const [constructorData, setConstructorData] = useState(null);
    const [selectedConstructor, setSelectedConstructor] = useState('none');
    const [constructorIds, setConstructorIds] = useState([]);

    // Load and process data
    useEffect(() => {
        loadData().then(({ races, constructors, results }) => {
            setRaces(races);
            setConstructors(constructors);
            setResults(results);

            const filteredRaces = races.filter(r => +r.year >= 2018 && +r.year <= 2024);
            const raceIds = filteredRaces.map(r => r.raceId);
            const constructorIds = [...new Set(results
                .filter(r => raceIds.includes(r.raceId))
                .map(r => r.constructorId))];
            setConstructorIds(constructorIds);

            const filteredConstructors = constructors.filter(c => constructorIds.includes(c.constructorId));

            const raceMap = {};
            filteredRaces.forEach(r => {
                raceMap[r.raceId] = { year: +r.year };
            });

            // Aggregate points and wins per constructor per year
            const constructorStats = [];
            filteredConstructors.forEach(c => {
                for (let year = 2018; year <= 2024; year++) {
                    const yearRaces = filteredRaces.filter(r => +r.year === year).map(r => r.raceId);
                    const yearResults = results.filter(r => yearRaces.includes(r.raceId) && r.constructorId === c.constructorId);
                    const points = d3.sum(yearResults, r => +r.points);
                    const wins = yearResults.filter(r => +r.position === 1).length;
                    constructorStats.push({
                        constructorId: c.constructorId,
                        year,
                        points,
                        wins
                    });
                }
            });

            // Prepare data for stacking
            const years = d3.range(2018, 2025);
            const stackData = years.map(year => {
                const yearData = { year };
                filteredConstructors.forEach(c => {
                    const stat = constructorStats.find(s => s.constructorId === c.constructorId && s.year === year);
                    yearData[c.constructorId] = stat ? stat.points : 0;
                });
                return yearData;
            });

            // Stack the data
            const stack = d3.stack()
                .keys(constructorIds)
                .value((d, key) => d[key]);
            const stackedData = stack(stackData);

            // Organize constructor data
            const constructorData = {};
            filteredConstructors.forEach(c => {
                const yearsData = constructorStats
                    .filter(s => s.constructorId === c.constructorId)
                    .map(s => ({ year: s.year, points: s.points, wins: s.wins }))
                    .sort((a, b) => a.year - b.year);
                constructorData[c.constructorId] = {
                    name: c.name,
                    yearsData
                };
            });

            setConstructorData({ constructors: constructorData, stacked: stackedData });
            setSelectedConstructor('none'); // Set initial to 'none'
        });
    }, []);

    // Setup chart
    useEffect(() => {
        if (!constructorData || !constructorIds.length) return;

        const svg = d3.select(svgRef.current);
        const margin = { top: 70, right: 200, bottom: 70, left: 80 };
        const width = +svg.attr('width') - margin.left - margin.right;
        const height = +svg.attr('height') - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([2018, 2024]).range([0, width]);
        const y = d3.scaleLinear().domain([0, d3.max(constructorData.stacked, layer => d3.max(layer, d => d[1]))]).range([height, 0]);

        // Define team-inspired color scheme
        const teamColors = {
            '1': '#FF8700', // McLaren
            '131': '#C0C0C0', // Mercedes
            '3': '#37A7D8', // Williams
            '6': '#FF1801', // Ferrari
            '9': '#1B3F8B', // Red Bull
            '214': '#0093C7', // Alpine
            '210': '#4B4B4B', // Haas
            '51': '#960000', // Alfa Romeo
            '213': '#F4F4F4', // AlphaTauri
            '117': '#2D8265', // Aston Martin
            '4': '#000000', // Renault
            '5': '#A39064', // Toro Rosso
            '10': '#00A85C', // Force India
            '211': '#EC0374', // Racing Point
            '15': '#DE3126', // Sauber
            '215': '#1A1F71', // RB
        };
        const color = d3.scaleOrdinal()
            .domain(constructorIds)
            .range(constructorIds.map(id => teamColors[id] || '#666'));

        // X-axis with gridlines and label
        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickFormat(d3.format('d'))
                .tickSize(-height)
                .tickPadding(10)
            )
            .append('text')
            .attr('x', width / 2)
            .attr('y', 40)
            .attr('fill', '#333')
            .attr('font-size', '16px')
            .attr('font-family', 'Formula1, sans-serif')
            .text('Year');

        // Y-axis with gridlines and label
        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(y)
                .ticks(5)
                .tickSize(-width)
                .tickPadding(10)
            )
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2 + 50)
            .attr('y', -50)
            .attr('fill', '#333')
            .attr('font-size', '16px')
            .attr('font-family', 'Formula1, sans-serif')
            .text('Constructor Points');

        // Style gridlines
        g.selectAll('.x-axis .tick line, .y-axis .tick line')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', 0.5)
            .attr('stroke-dasharray', '2,2');

        // Style axis lines
        g.selectAll('.x-axis .domain, .y-axis .domain')
            .attr('stroke', '#333')
            .attr('stroke-width', 1.5);

        // Add chart title
        svg.append('text')
            .attr('x', margin.left + width / 2)
            .attr('y', margin.top / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '24px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'Formula1, sans-serif')
            .attr('fill', '#222')
            .text('Constructor Points Dominance (2018–2024)');

        // Add legend to the right of the visualization
        const legend = svg.append('g')
            .attr('transform', `translate(${margin.left + width + 50}, ${margin.top - 10})`);
        const legendItems = Object.entries(constructorData.constructors);
        legend.selectAll('.legend-item')
            .data(legendItems)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 25})`)
            .each(function(d) {
                const g = d3.select(this);
                g.append('rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', 15)
                    .attr('height', 15)
                    .attr('fill', color(d[0]));
                g.append('text')
                    .attr('x', 20)
                    .attr('y', 12)
                    .attr('font-size', '14px')
                    .attr('font-family', 'Formula1, sans-serif')
                    .attr('fill', '#333')
                    .text(d[1].name);
            });

        // Add gradients for each constructor
        const defs = svg.append('defs');
        constructorIds.forEach(id => {
            defs.append('linearGradient')
                .attr('id', `area-gradient-${id}`)
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '0%')
                .attr('y2', '100%')
                .selectAll('stop')
                .data([
                    { offset: '0%', color: d3.color(color(id)).copy({ opacity: 0.6 }).toString() },
                    { offset: '100%', color: d3.color(color(id)).copy({ opacity: 0.1 }).toString() }
                ])
                .enter()
                .append('stop')
                .attr('offset', d => d.offset)
                .attr('stop-color', d => d.color);
        });

        // Add area paths
        g.append('g')
            .attr('class', 'areas')
            .selectAll('path')
            .data(constructorData.stacked)
            .enter()
            .append('path')
            .attr('class', d => `area area-${d.key}`)
            .attr('fill', d => `url(#area-gradient-${d.key})`)
            .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

        // Add tooltip
        d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background', '#fff')
            .style('padding', '5px 10px')
            .style('border', '1px solid #ccc')
            .style('border-radius', '4px')
            .style('box-shadow', '0 2px 5px rgba(0,0,0,0.2)')
            .style('font-family', 'Formula1, sans-serif')
            .style('font-size', '12px')
            .style('display', 'none');
    }, [constructorData, constructorIds]);

    // Update chart dynamically when selectedConstructor changes
    useEffect(() => {
        if (!constructorData || !constructorIds.length) return;

        const svg = d3.select(svgRef.current);
        const g = svg.select('g');
        const margin = { top: 70, right: 200, bottom: 70, left: 80 };
        const width = +svg.attr('width') - margin.left - margin.right;
        const height = +svg.attr('height') - margin.top - margin.bottom;

        const x = d3.scaleLinear().domain([2018, 2024]).range([0, width]);
        const y = d3.scaleLinear().domain([0, d3.max(constructorData.stacked, layer => d3.max(layer, d => d[1]))]).range([height, 0]);

        // Define team-inspired color scheme
        const teamColors = {
            '1': '#FF8700', // McLaren
            '131': '#C0C0C0', // Mercedes
            '3': '#37A7D8', // Williams
            '6': '#FF1801', // Ferrari
            '9': '#1B3F8B', // Red Bull
            '214': '#0093C7', // Alpine
            '210': '#4B4B4B', // Haas
            '51': '#960000', // Alfa Romeo
            '213': '#F4F4F4', // AlphaTauri
            '117': '#2D8265', // Aston Martin
            '4': '#000000', // Renault
            '5': '#A39064', // Toro Rosso
            '10': '#00A85C', // Force India
            '211': '#EC0374', // Racing Point
            '15': '#DE3126', // Sauber
            '215': '#1A1F71', // RB
        };
        const color = d3.scaleOrdinal()
            .domain(constructorIds)
            .range(constructorIds.map(id => teamColors[id] || '#666'));

        const area = d3.area()
            .x(d => x(d.data.year))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveCatmullRom.alpha(0.5));

        // Update areas with animation
        g.selectAll('.area')
            .data(constructorData.stacked)
            .transition()
            .duration(750)
            .attr('d', area)
            .attr('opacity', d => selectedConstructor === 'none' || d.key === selectedConstructor ? 1 : 0.3)
            .attr('stroke', d => selectedConstructor !== 'none' && d.key === selectedConstructor ? '#333' : 'none')
            .attr('stroke-width', d => selectedConstructor !== 'none' && d.key === selectedConstructor ? 1 : 0);

        // Add mouse events for areas
        g.selectAll('.area')
            .on('mouseover', (event, d) => {
                const [xPos] = d3.pointer(event);
                const year = Math.round(x.invert(xPos));
                const yearData = constructorData.stacked.find(layer => layer.key === d.key)
                    .find(point => point.data.year === year);
                const points = yearData ? yearData.data[d.key] : 0;
                const constructorInfo = constructorData.constructors[d.key];
                const wins = constructorInfo.yearsData.find(y => y.year === year)?.wins || 0;

                d3.select('.tooltip')
                    .style('display', 'block')
                    .style('border-color', color(d.key))
                    .html(`
                        <strong style="color: ${color(d.key)}">${constructorInfo.name}</strong><br>
                        Year: ${year}<br>
                        Points: ${points.toFixed(0)}<br>
                        Wins: ${wins}
                    `)
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 30}px`);
            })
            .on('mouseout', () => d3.select('.tooltip').style('display', 'none'));
    }, [selectedConstructor, constructorData, constructorIds]);

    return (
        <>
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh', 
            background: '#f5f5f5' 
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{ marginRight: '20px', marginTop: '10px' }}>
                    <label 
                        htmlFor="constructor-select" 
                        className="block text-sm font-medium text-gray-700 font-[Formula1]"
                    >
                        Highlight Constructor:
                    </label>
                    <select
                        id="constructor-select"
                        value={selectedConstructor || 'none'}
                        onChange={(e) => setSelectedConstructor(e.target.value)}
                        className="mt-1 block w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-[Formula1]"
                        onFocus={(e) => {
                            e.target.style.borderColor = '#4682b4';
                            e.target.style.boxShadow = '0 0 5px rgba(70, 130, 180, 0.5)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#ccc';
                            e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
                        }}
                    >
                        <option value="none">None</option>
                        {constructorData && Object.entries(constructorData.constructors).map(([constructorId, data]) => (
                            <option key={constructorId} value={constructorId}>
                                {data.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col" style={{maxWidth: "1100px"}}>
                <svg 
                    ref={svgRef} 
                    width="1100" 
                    height="600" 
                    style={{ 
                        background: '#fff', 
                        borderRadius: '8px', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                    }}
                ></svg>
               <h3 className="font-[Formula1] mt-5 justify-center text-center">This chart shows how many points each F1 team (constructor) earned per season. It’s a great way to see which teams were dominant in different years and how the balance of power shifted over time.</h3>
            </div>
            </div>
        </div>
               </>
    );
};

export default ConstructorDominance;