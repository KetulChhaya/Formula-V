import { useEffect, useState, useRef } from 'react';
import { loadData } from '../../utils/data';
import * as d3 from 'd3';

const WinningMargins = () => {
    const svgRef = useRef();
    const [races, setRaces] = useState([]);
    const [results, setResults] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('2014');
    const [chartData, setChartData] = useState([]);
    const [years, setYears] = useState([]);

    // Load and process data
    useEffect(() => {
        loadData().then(({ races, results, drivers }) => {
            setRaces(races);
            setResults(results);
            setDrivers(drivers);

            const filteredRaces = races.filter(r => +r.year >= 2014 && +r.year <= 2024);
            const uniqueYears = [...new Set(filteredRaces.map(r => +r.year))].sort();
            setYears(uniqueYears);
            setSelectedSeason(uniqueYears[0]?.toString() || '2014');

            const seasonRaces = filteredRaces.filter(r => r.year === selectedSeason).sort((a, b) => +a.round - +b.round);
            const data = seasonRaces.map(race => {
                const raceResults = results.filter(res => res.raceId === race.raceId);
                const winner = raceResults.find(res => +res.positionOrder === 1);
                const runnerUp = raceResults.find(res => +res.positionOrder === 2);
                if (winner && runnerUp && winner.milliseconds && runnerUp.milliseconds) {
                    const winningMargin = (parseInt(runnerUp.milliseconds) - parseInt(winner.milliseconds)) / 1000;
                    const winnerDriver = drivers.find(d => d.driverId === winner.driverId);
                    const runnerUpDriver = drivers.find(d => d.driverId === runnerUp.driverId);
                    return {
                        raceId: race.raceId,
                        round: +race.round,
                        raceName: race.name,
                        winningMargin,
                        winner: `${winnerDriver?.forename} ${winnerDriver?.surname}`,
                        runnerUp: `${runnerUpDriver?.forename} ${runnerUpDriver?.surname}`
                    };
                }
                return null;
            }).filter(d => d !== null);
            setChartData(data);
        });
    }, []);

    // Update chart data when selectedSeason changes
    useEffect(() => {
        if (!races.length || !results.length || !drivers.length) return;

        const seasonRaces = races.filter(r => r.year === selectedSeason).sort((a, b) => +a.round - +b.round);
        const data = seasonRaces.map(race => {
            const raceResults = results.filter(res => res.raceId === race.raceId);
            const winner = raceResults.find(res => +res.positionOrder === 1);
            const runnerUp = raceResults.find(res => +res.positionOrder === 2);
            if (winner && runnerUp && winner.milliseconds && runnerUp.milliseconds) {
                const winningMargin = (parseInt(runnerUp.milliseconds) - parseInt(winner.milliseconds)) / 1000;
                const winnerDriver = drivers.find(d => d.driverId === winner.driverId);
                const runnerUpDriver = drivers.find(d => d.driverId === runnerUp.driverId);
                return {
                    raceId: race.raceId,
                    round: +race.round,
                    raceName: race.name,
                    winningMargin,
                    winner: `${winnerDriver?.forename} ${winnerDriver?.surname}`,
                    runnerUp: `${runnerUpDriver?.forename} ${runnerUpDriver?.surname}`
                };
            }
            return null;
        }).filter(d => d !== null);
        setChartData(data);
    }, [selectedSeason, races, results, drivers]);

    // Setup chart
    useEffect(() => {
        if (!chartData.length) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        const margin = { top: 70, right: 70, bottom: 80, left: 80 };
        const width = +svg.attr('width') - margin.left - margin.right;
        const height = +svg.attr('height') - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scalePoint()
            .domain(chartData.map(d => d.round.toString()))
            .range([0, width])
            .padding(0.5);
        const y = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.winningMargin) * 1.1])
            .range([height, 0]);

        // Axes with gridlines
        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).tickSize(-height))
            .append('text')
            .attr('x', width / 2)
            .attr('y', 40)
            .attr('fill', '#333')
            .attr('font-size', '16px')
            .attr('font-family', 'Arial, sans-serif')
            .text('Race Round');

        g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(y).ticks(5).tickSize(-width))
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2 + 70)
            .attr('y', -40)
            .attr('fill', '#333')
            .attr('font-size', '16px')
            .attr('font-family', 'Arial, sans-serif')
            .text('Winning Margin (seconds)');

        // Style gridlines and axes
        g.selectAll('.x-axis .tick line, .y-axis .tick line')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-width', 0.5)
            .attr('stroke-dasharray', '2,2');
        g.selectAll('.x-axis .domain, .y-axis .domain')
            .attr('stroke', '#333')
            .attr('stroke-width', 1.5);

        // Title
        svg.append('text')
            .attr('x', margin.left + width / 2)
            .attr('y', margin.top / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '24px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'Arial, sans-serif')
            .attr('fill', '#222')
            .text(`Winning Time Margins in Formula 1 - ${selectedSeason}`);

        // Caption
        svg.append('text')
            .attr('x', margin.left + width / 2)
            .attr('y', height + margin.top + 65)
            .attr('text-anchor', 'middle')
            .attr('font-size', '14px')
            .attr('font-family', 'Arial, sans-serif')
            .attr('fill', '#666')
            .text('Time margin between winner and runner-up per race');

        // Line
        const line = d3.line()
            .x(d => x(d.round.toString()))
            .y(d => y(d.winningMargin))
            .curve(d3.curveMonotoneX);

        g.selectAll('.line')
            .data([chartData])
            .join(
                enter => enter.append('path')
                    .attr('class', 'line')
                    .attr('fill', 'none')
                    .attr('stroke', '#007bff')
                    .attr('stroke-width', 2)
                    .attr('d', line)
                    .attr('opacity', 0)
                    .transition()
                    .duration(750)
                    .attr('opacity', 1),
                update => update
                    .transition()
                    .duration(750)
                    .attr('d', line),
                exit => exit
                    .transition()
                    .duration(750)
                    .attr('opacity', 0)
                    .remove()
            );

        // Circles
        g.selectAll('.circle')
            .data(chartData, d => d.raceId)
            .join(
                enter => enter.append('circle')
                    .attr('class', 'circle')
                    .attr('cx', d => x(d.round.toString()))
                    .attr('cy', d => y(d.winningMargin))
                    .attr('r', 5)
                    .attr('fill', 'white')
                    .attr('stroke', '#007bff')
                    .attr('stroke-width', 1.5)
                    .attr('opacity', 0)
                    .transition()
                    .duration(750)
                    .attr('opacity', 1),
                update => update
                    .transition()
                    .duration(750)
                    .attr('cx', d => x(d.round.toString()))
                    .attr('cy', d => y(d.winningMargin)),
                exit => exit
                    .transition()
                    .duration(750)
                    .attr('opacity', 0)
                    .remove()
            );

        // Tooltip
        const tooltip = d3.select('body').selectAll('.tooltip')
            .data([0])
            .join('div')
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

        g.selectAll('.circle')
            .on('mouseover', (event, d) => {
                tooltip.style('display', 'block')
                    .html(`
                        <strong>${d.raceName}</strong><br>
                        Margin: ${d.winningMargin.toFixed(2)} seconds<br>
                        Winner: ${d.winner}<br>
                        Runner-up: ${d.runnerUp}
                    `)
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 30}px`);
            })
            .on('mouseout', () => tooltip.style('display', 'none'));
    }, [chartData]);

    return (
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
                        htmlFor="season-select" 
                        style={{ 
                            fontSize: '16px', 
                            fontWeight: 'bold', 
                            fontFamily: 'Arial, sans-serif', 
                            color: '#333' 
                        }}
                    >
                        Select Season:
                    </label>
                    <select
                        id="season-select"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                        style={{
                            display: 'block',
                            padding: '12px',
                            fontSize: '16px',
                            fontFamily: 'Arial, sans-serif',
                            borderRadius: '6px',
                            border: '1px solid #ccc',
                            background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            width: '220px',
                            outline: 'none',
                            transition: 'border-color 0.3s, box-shadow 0.3s'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = '#4682b4';
                            e.target.style.boxShadow = '0 0 5px rgba(70, 130, 180, 0.5)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#ccc';
                            e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
                        }}
                    >
                        {years.map(year => (
                            <option key={year} value={year.toString()}>{year}</option>
                        ))}
                    </select>
                </div>
                <svg 
                    ref={svgRef} 
                    width="1000" 
                    height="500" 
                    style={{ 
                        background: '#fff', 
                        borderRadius: '8px' 
                    }}
                ></svg>
            </div>
        </div>
    );
};

export default WinningMargins;