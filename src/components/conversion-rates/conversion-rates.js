import { useEffect, useState, useRef, use } from 'react';
import { loadData } from '../../utils/data';
import * as d3 from 'd3';

const ConversionRates = () => {
    const svgRef = useRef();
    const [races, setRaces] = useState([]);
    const [circuits, setCircuits] = useState([]);
    const [qualifying, setQualifying] = useState([]);
    const [results, setResults] = useState([]);
    const [circuitData, setCircuitData] = useState(null);
    const [selectedCircuit, setSelectedCircuit] = useState(null);

    // Load and process data
    useEffect(() => {
        loadData().then(({ races, circuits, qualifying, results }) => {
            setRaces(races);
            setCircuits(circuits);
            setQualifying(qualifying);
            setResults(results);

            const filteredRaces = races.filter(r => +r.year >= 2018 && +r.year <= 2024);
            const circuitIds = [...new Set(filteredRaces.map(r => r.circuitId))];
            const filteredCircuits = circuits.filter(c => circuitIds.includes(c.circuitId));

            const raceMap = {};
            filteredRaces.forEach(r => {
                raceMap[r.raceId] = { year: +r.year, circuitId: r.circuitId, name: r.name };
            });

            const conversionRates = filteredRaces.map(race => {
                const raceId = race.raceId;
                const top10Qualifiers = qualifying
                    .filter(q => q.raceId === raceId && +q.position <= 10)
                    .map(q => q.driverId);
                const top10Finishers = results
                    .filter(res => res.raceId === raceId && top10Qualifiers.includes(res.driverId) && +res.positionOrder <= 10);
                const conversionRate = (top10Finishers.length / 10) * 100;
                return { circuitId: raceMap[raceId].circuitId, year: raceMap[raceId].year, conversionRate };
            });

            const circuitData = {};
            filteredCircuits.forEach(c => {
                const rates = conversionRates.filter(cr => cr.circuitId === c.circuitId);
                const yearsData = rates.map(cr => ({ year: cr.year, conversionRate: cr.conversionRate }))
                    .sort((a, b) => a.year - b.year);
                const averageRate = d3.mean(rates, cr => cr.conversionRate);
                circuitData[c.circuitId] = { circuitName: c.name, averageRate, yearsData };
            });

            setCircuitData(circuitData);
            if (filteredCircuits.length > 0) {
                setSelectedCircuit(filteredCircuits[0].circuitId); // Set initial circuit
            }
        });
    }, []);

    // Setup chart
    useEffect(() => {
        if (!circuitData) return;

        const svg = d3.select(svgRef.current);
        const margin = { top: 20, right: 20, bottom: 30, left: 50 };
        const width = +svg.attr('width') - margin.left - margin.right;
        const height = +svg.attr('height') - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([2018, 2024]).range([0, width]);
        const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format('d')));

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`));

        g.append('path')
            .attr('class', 'line')
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2);

        g.append('g')
            .attr('class', 'points');

        d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('display', 'none');
    }, [circuitData]);

    // Update chart dynamically when selectedCircuit changes
    useEffect(() => {
        if (!circuitData || !selectedCircuit) return;

        const svg = d3.select(svgRef.current);
        const g = svg.select('g');
        const width = +svg.attr('width') - 50 - 20; // margin left + right
        const height = +svg.attr('height') - 20 - 30; // margin top + bottom

        const x = d3.scaleLinear().domain([2018, 2024]).range([0, width]);
        const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);
        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.conversionRate))
            .defined(d => d.conversionRate !== null);

        const data = circuitData[selectedCircuit];
        g.select('.line')
            .datum(data.yearsData)
            .attr('d', line);

        const points = g.select('.points').selectAll('circle').data(data.yearsData);
        points.enter()
            .append('circle')
            .attr('r', 4)
            .attr('fill', 'steelblue')
            .merge(points)
            .attr('cx', d => x(d.year))
            .attr('cy', d => y(d.conversionRate))
            .on('mouseover', (event, d) => {
                d3.select('.tooltip')
                    .style('display', 'block')
                    .html(`Year: ${d.year}<br>Rate: ${d.conversionRate.toFixed(1)}%`)
                    .style('left', `${event.pageX + 5}px`)
                    .style('top', `${event.pageY - 28}px`);
            })
            .on('mouseout', () => d3.select('.tooltip').style('display', 'none'));
        points.exit().remove();
    }, [selectedCircuit, circuitData]);

    return (
        <div>
            <label htmlFor="circuit-select">Select Circuit: </label>
            <select
                id="circuit-select"
                value={selectedCircuit || ''}
                onChange={(e) => setSelectedCircuit(e.target.value)}
            >
                {circuitData && Object.entries(circuitData).map(([circuitId, data]) => (
                    <option key={circuitId} value={circuitId}>
                        {data.circuitName}
                    </option>
                ))}
            </select>
            <h2>{selectedCircuit && circuitData ? `Conversion Rates for ${circuitData[selectedCircuit].circuitName}` : ''}</h2>
            <p>{selectedCircuit && circuitData ? `Average Conversion Rate: ${circuitData[selectedCircuit].averageRate.toFixed(1)}%` : ''}</p>
            <svg ref={svgRef} width="800" height="400"></svg>
        </div>
    );
};

export default ConversionRates;