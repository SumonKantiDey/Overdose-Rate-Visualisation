// ALL VISUALIZATIONS BELOW

// stanza 1 vis
function renderLineChart(g, W, data) {
  const opioidCountCols = [
    "Opioid Death Count (2010-2013)",
    "Opioid Death Count (2014-2017)",
    "Opioid Death Count (2018-2021)"
  ];

  const periods1 = ["2010-2013", "2014-2017", "2018-2021"];

  const totals = periods1.map((period, i) => ({
    period: period,
    deaths: d3.sum(data, d => cleanNumber(d[opioidCountCols[i]]))
  }));

  const margin1 = { top: 60, right: 40, bottom: 70, left: 100 };
  const width1 = W - margin1.left - margin1.right;
  const height1 = 500 - margin1.top - margin1.bottom;

  const chartG = g.append("g")
    .attr("transform", `translate(${margin1.left},${margin1.top})`);

  const x1 = d3.scalePoint()
    .domain(periods1)
    .range([0, width1])
    .padding(0.5);

  const y1 = d3.scaleLinear()
    .domain([0, d3.max(totals, d => d.deaths)])
    .nice()
    .range([height1, 0]);

  chartG.append("g")
    .attr("transform", `translate(0,${height1})`)
    .call(d3.axisBottom(x1));

  chartG.append("g")
    .call(d3.axisLeft(y1));

  const line1 = d3.line()
    .x(d => x1(d.period))
    .y(d => y1(d.deaths));

  chartG.append("path")
    .datum(totals)
    .attr("class", "line")
    .attr("stroke", "steelblue")
    .attr("d", line1);

  chartG.selectAll(".dot1")
    .data(totals)
    .enter()
    .append("circle")
    .attr("cx", d => x1(d.period))
    .attr("cy", d => y1(d.deaths))
    .attr("r", 5)
    .attr("fill", "steelblue");

  chartG.selectAll(".label1")
    .data(totals)
    .enter()
    .append("text")
    .attr("x", d => x1(d.period))
    .attr("y", d => y1(d.deaths) - 10)
    .attr("text-anchor", "middle")
    .text(d => d.deaths);

  chartG.append("text")
    .attr("class", "chart-title")
    .attr("x", width1 / 2)
    .attr("y", -margin1.top + 30)
    .attr("text-anchor", "middle")
    .text("Total Opioid Deaths Over Time");

  chartG.append("text")
    .attr("class", "axis-label")
    .attr("x", width1 / 2)
    .attr("y", height1 + margin1.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Time Period");

  chartG.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height1 / 2)
    .attr("y", -margin1.left + 20)
    .attr("text-anchor", "middle")
    .text("Total Opioid Deaths");
}

// stanza 4 vis
function renderMapChart(g, W, data, us) {
  const tooltip = d3.select("#tooltip");

  const bachelorsCol =
    "Percent of Population Aged 25+ who Have a Bachelor's Degree or More (2017-2021)";
  const opioidRateCol =
    "Crude Opioid Death Rate (2018-2021)";

  const dataByGEOID = new Map();
  data.forEach(d => {
    const geoid = String(d.GEOID).padStart(5, "0");
    dataByGEOID.set(geoid, {
      name: d.NAME,
      bachelors: cleanNumber(d[bachelorsCol]),
      opioidRate: cleanNumber(d[opioidRateCol])
    });
  });

  const counties = topojson.feature(us, us.objects.counties).features;
  const georgiaCounties = counties.filter(d => String(d.id).startsWith("13"));

  const projection = d3.geoMercator();
  const path = d3.geoPath(projection);

  projection.fitSize(
    [300, 440],
    {
      type: "FeatureCollection",
      features: georgiaCounties
    }
  );

  const leftMapX = 0;
  const rightMapX = 400;
  const mapY = 95;

  const chartG = g.append("g");

  const mapGroup1 = chartG.append("g")
    .attr("transform", `translate(${leftMapX},${mapY})`);

  const mapGroup2 = chartG.append("g")
    .attr("transform", `translate(${rightMapX},${mapY})`);

  const bachelorsMax = d3.max(georgiaCounties, d => {
    const row = dataByGEOID.get(String(d.id));
    return row ? row.bachelors : 0;
  }) || 1;

  const opioidRateMax = d3.max(georgiaCounties, d => {
    const row = dataByGEOID.get(String(d.id));
    return row ? row.opioidRate : 0;
  }) || 1;

  const bachelorsColor = d3.scaleSequential()
    .domain([0, bachelorsMax])
    .interpolator(d3.interpolateBlues);

  const opioidColor = d3.scaleSequential()
    .domain([0, opioidRateMax])
    .interpolator(d3.interpolateBlues);

  chartG.append("text")
    .attr("class", "chart-title")
    .attr("x", W / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .text("Georgia Counties: Education and Opioid Death Rates");

  chartG.append("text")
    .attr("class", "map-title")
    .attr("x", leftMapX)
    .attr("y", 70)
    .text("Bachelor's Degree Share (2017-2021)");

  chartG.append("text")
    .attr("class", "map-title")
    .attr("x", rightMapX)
    .attr("y", 70)
    .text("Crude Opioid Death Rate (2018-2021)");

  mapGroup1.selectAll("path")
    .data(georgiaCounties)
    .enter()
    .append("path")
    .attr("class", "county")
    .attr("d", path)
    .attr("fill", d => {
      const row = dataByGEOID.get(String(d.id));
      return row ? bachelorsColor(row.bachelors) : "#eee";
    })
    .on("mousemove", function(event, d) {
      const row = dataByGEOID.get(String(d.id));
      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${row ? row.name : "Unknown County"}</strong><br>
          Bachelor's %: ${row ? row.bachelors.toFixed(2) : "N/A"}<br>
          Opioid Death Rate: ${row ? row.opioidRate.toFixed(2) : "N/A"} per 100k
        `)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  mapGroup1.selectAll(".label-left")
    .data(georgiaCounties)
    .enter()
    .append("text")
    .attr("class", "county-label")
    .attr("transform", d => {
      const centroid = path.centroid(d);
      return `translate(${centroid[0]},${centroid[1]})`;
    })
    .text(d => {
      const row = dataByGEOID.get(String(d.id));
      if (!row || row.opioidRate === 0) return "";
      return row.opioidRate.toFixed(1);
    });

  mapGroup2.selectAll("path")
    .data(georgiaCounties)
    .enter()
    .append("path")
    .attr("class", "county")
    .attr("d", path)
    .attr("fill", d => {
      const row = dataByGEOID.get(String(d.id));
      return row ? opioidColor(row.opioidRate) : "#eee";
    })
    .on("mousemove", function(event, d) {
      const row = dataByGEOID.get(String(d.id));
      tooltip
        .style("opacity", 1)
        .html(`
          <strong>${row ? row.name : "Unknown County"}</strong><br>
          Bachelor's %: ${row ? row.bachelors.toFixed(2) : "N/A"}<br>
          Opioid Death Rate: ${row ? row.opioidRate.toFixed(2) : "N/A"} per 100k
        `)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  mapGroup2.selectAll(".label-right")
    .data(georgiaCounties)
    .enter()
    .append("text")
    .attr("class", "county-label")
    .attr("transform", d => {
      const centroid = path.centroid(d);
      return `translate(${centroid[0]},${centroid[1]})`;
    })
    .text(d => {
      const row = dataByGEOID.get(String(d.id));
      return row ? row.opioidRate.toFixed(1) : "";
    });

  function drawLegend(svg, x, y, width, height, colorScale, maxValue, label, gradientId) {
    const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");

    const gradient = defs.append("linearGradient")
      .attr("id", gradientId)
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      gradient.append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorScale(t * maxValue));
    }

    svg.append("rect")
      .attr("x", x)
      .attr("y", y)
      .attr("width", width)
      .attr("height", height)
      .style("fill", `url(#${gradientId})`)
      .style("stroke", "#999");

    const legendScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, width]);

    svg.append("g")
      .attr("transform", `translate(${x},${y + height})`)
      .call(d3.axisBottom(legendScale).ticks(5));

    svg.append("text")
      .attr("class", "legend-label")
      .attr("x", x + width / 2)
      .attr("y", y - 8)
      .attr("text-anchor", "middle")
      .text(label);
  }

  drawLegend(
    chartG,
    leftMapX + 70,
    550,
    220,
    14,
    bachelorsColor,
    bachelorsMax,
    "Bachelor's Degree Share (%)",
    "bachelors-gradient"
  );

  drawLegend(
    chartG,
    rightMapX + 70,
    550,
    220,
    14,
    opioidColor,
    opioidRateMax,
    "Opioid Death Rate per 100k",
    "opioid-gradient"
  );
}

// stanza 3 vis
function renderMentalHealth(g, W, plotData) {
  const facilityCol = "Number of Mental Health Facilities (As of March 2023)";
  const rateCol = "Crude Opioid Death Rate (2018-2021)";
  const countCol = "Opioid Death Count (2018-2021)";

  const margin = { top: 60, right: 30, bottom: 80, left: 100 };
  const width = W - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  const chartG = g.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  chartG.append("text")
    .attr("x", width / 2)
    .attr("y", -margin.top + 15)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .style("fill", "#2c3e50")
    .text("Georgia Counties: Mental Health Facility Availability vs Opioid Mortality");

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  const xMax = d3.max(plotData, d => d[facilityCol]);
  const xScale = d3.scaleLinear()
    .domain([-1, xMax + 1])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(plotData, d => d[rateCol])])
    .range([height, 0]);

  const sizeScale = d3.scaleSqrt()
    .domain([0, d3.max(plotData, d => d[countCol])])
    .range([4, 24]);

  chartG.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale)
      .tickValues([0, 2.5, 5, 7.5, 10.0, 12.5, 15.0, 17.5, 20.0])
      .tickFormat(d => d3.format(".1f")(d))
      .tickSizeOuter(0)
    )
    .selectAll("text")
    .style("font-size", "11px")
    .style("text-anchor", "middle")
    .attr("dy", "1em");

  chartG.append("g")
    .call(d3.axisLeft(yScale)
      .ticks(8)
      .tickSizeOuter(0)
    );

  chartG.selectAll("line.horizontalGrid")
    .data(yScale.ticks())
    .enter()
    .append("line")
    .attr("class", "horizontalGrid")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", d => yScale(d))
    .attr("y2", d => yScale(d))
    .style("stroke", "#ddd")
    .style("stroke-width", 0.5)
    .style("stroke-dasharray", "2,2")
    .style("opacity", 0.25);

  chartG.selectAll("line.verticalGrid")
    .data(xScale.ticks())
    .enter()
    .append("line")
    .attr("class", "verticalGrid")
    .attr("x1", d => xScale(d))
    .attr("x2", d => xScale(d))
    .attr("y1", 0)
    .attr("y2", height)
    .style("stroke", "#ddd")
    .style("stroke-width", 0.5)
    .style("stroke-dasharray", "2,2")
    .style("opacity", 0.25);

  const medianFac = d3.median(plotData, d => d[facilityCol]);
  const medianRate = d3.median(plotData, d => d[rateCol]);

  chartG.append("line")
    .attr("x1", xScale(medianFac))
    .attr("x2", xScale(medianFac))
    .attr("y1", 0)
    .attr("y2", height)
    .style("stroke", "gray")
    .style("stroke-dasharray", "5,5")
    .style("opacity", 0.5);

  chartG.append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", yScale(medianRate))
    .attr("y2", yScale(medianRate))
    .style("stroke", "gray")
    .style("stroke-dasharray", "5,5")
    .style("opacity", 0.5);

  chartG.append("text")
    .attr("x", xScale(medianFac) + 100)
    .attr("y", 20)
    .style("font-size", "12px")
    .style("fill", "gray")
    .style("opacity", 0.7)
    .text("More facilities");

  chartG.append("text")
    .attr("x", 10)
    .attr("y", yScale(medianRate) - 10)
    .style("font-size", "12px")
    .style("fill", "gray")
    .style("opacity", 0.7)
    .text("Higher severity");

  chartG.append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text("Mental Health Facilities (2023)");

  chartG.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -height / 2)
    .text("Crude Opioid Death Rate (2018–2021)");

  const topRate = plotData.sort((a, b) => b[rateCol] - a[rateCol]).slice(0, 2);
  const topCount = plotData.sort((a, b) => b[countCol] - a[countCol]).slice(0, 2);
  const topFacility = plotData.sort((a, b) => b[facilityCol] - a[facilityCol]).slice(0, 1);
  const toLabel = [...new Set([...topRate, ...topCount, ...topFacility])].slice(0,4);

  const circles = chartG.selectAll("circle")
    .data(plotData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d[facilityCol]))
    .attr("cy", d => yScale(d[rateCol]))
    .attr("r", d => sizeScale(d[countCol]))
    .style("fill", "#4F9AD1")
    .style("stroke", "black")
    .style("stroke-width", 1)
    .on("mouseover", (event, d) => {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`<strong>${d.county}</strong><br/>Facilities: ${d[facilityCol]}<br/>Death Rate: ${d[rateCol]}<br/>Death Count: ${d[countCol]}`)
        .style("left", (event.pageX + 5) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  const simulation = d3.forceSimulation(plotData)
    .force("x", d3.forceX(d => xScale(d[facilityCol])).strength(0.5))
    .force("y", d3.forceY(d => yScale(d[rateCol])).strength(0.5))
    .force("collide", d3.forceCollide(d => sizeScale(d[countCol]) + 2).strength(0.8))
    .on("tick", () => {
      circles
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

  simulation.stop();
  for (let i = 0; i < 300; ++i) simulation.tick();

  chartG.selectAll("line.connector")
    .data(toLabel)
    .enter()
    .append("line")
    .attr("class", "connector")
    .attr("x1", d => xScale(d[facilityCol]))
    .attr("y1", d => yScale(d[rateCol]))
    .attr("x2", (d, i) => {
      const offset = i > 0 ? i * 35 : 10;
      return xScale(d[facilityCol]) + offset;
    })
    .attr("y2", (d, i) => yScale(d[rateCol]) - 10 - i * 15)
    .style("stroke", "#666")
    .style("stroke-width", 1)
    .style("opacity", 0.5)
    .style("stroke-dasharray", "3,3");

  chartG.selectAll("rect.label-bg")
    .data(toLabel)
    .enter()
    .append("rect")
    .attr("class", "label-bg")
    .attr("x", (d, i) => {
      const offset = i > 0 ? i * 35 : 10;
      return xScale(d[facilityCol]) + offset - 3;
    })
    .attr("y", (d, i) => yScale(d[rateCol]) - 20 - i * 15)
    .attr("width", 50)
    .attr("height", 14)
    .style("fill", "white")
    .style("stroke", "#ccc")
    .style("stroke-width", 0.5)
    .style("opacity", 0.9);

  chartG.selectAll("text.label")
    .data(toLabel)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", (d, i) => {
      const offset = i > 0 ? i * 35 : 10;
      return xScale(d[facilityCol]) + offset;
    })
    .attr("y", (d, i) => yScale(d[rateCol]) - 8 - i * 15)
    .attr("text-anchor", "start")
    .style("font-size", "10px")
    .style("fill", "#2c3e50")
    .style("font-weight", "600")
    .text(d => d.county);

  const legendCounts = [25, 100, 250];
  const legendSizes = legendCounts.map(c => sizeScale(c));

  const legend = chartG.append("g")
    .attr("transform", `translate(${width - 100}, 50)`);

  legend.append("text")
    .attr("x", 0)
    .attr("y", -8)
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text("Bubble size =");

  legend.append("text")
    .attr("x", 0)
    .attr("y", 5)
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text("Opioid death count");

  legend.selectAll("circle.legend")
    .data(legendSizes)
    .enter()
    .append("circle")
    .attr("class", "legend")
    .attr("cx", 20)
    .attr("cy", (d, i) => 25 + i * 30)
    .attr("r", d => d)
    .style("fill", "#4F9AD1")
    .style("stroke", "black")
    .style("stroke-width", 0.5)
    .style("opacity", 0.6);

  legend.selectAll("text.legend")
    .data(legendCounts)
    .enter()
    .append("text")
    .attr("class", "legend")
    .attr("x", 50)
    .attr("y", (d, i) => 25 + i * 30)
    .style("font-size", "10px")
    .text(d => `${d} deaths`);

  const explanation = chartG.append("g")
    .attr("transform", `translate(${width / 2 - 100}, 10)`);

  explanation.append("rect")
    .attr("x", -10)
    .attr("y", -20)
    .attr("width", 200)
    .attr("height", 40)
    .style("fill", "white")
    .style("stroke", "gray")
    .style("stroke-width", 1)
    .style("opacity", 0.9);

  explanation.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .style("font-size", "10px")
    .text("Higher position = greater severity");

  explanation.append("text")
    .attr("x", 0)
    .attr("y", 15)
    .style("font-size", "10px")
    .text("Larger bubble = greater burden");
}

// stanza 2 vis
const groups = [
  {
    id: 'ers1', label: 'ERS 1', color: '#2a9d5c', dashed: false,
    values: [
      { period: '2010–2013', year: 2011.5, rate: 46.24 },
      { period: '2014–2017', year: 2015.5, rate: 61.17 },
      { period: '2018–2021', year: 2019.5, rate: 63.01 },
    ]
  },
  {
    id: 'ers2', label: 'ERS 2', color: 'gold', dashed: false,
    values: [
      { period: '2010–2013', year: 2011.5, rate: 38.23 },
      { period: '2014–2017', year: 2015.5, rate: 48.93 },
      { period: '2018–2021', year: 2019.5, rate: 63.50 },
    ]
  },
  {
    id: 'ers3', label: 'ERS 3', color: 'darkorange', dashed: false,
    values: [
      { period: '2010–2013', year: 2011.5, rate: 53.74 },
      { period: '2014–2017', year: 2015.5, rate: 53.00 },
      { period: '2018–2021', year: 2019.5, rate: 74.38 },
    ]
  },
  {
    id: 'ers4', label: 'ERS 4', color: '#d94f3d', dashed: false,
    values: [
      { period: '2010–2013', year: 2011.5, rate: 39.68 },
      { period: '2014–2017', year: 2015.5, rate: 43.87 },
      { period: '2018–2021', year: 2019.5, rate: 59.87 },
    ]
  },
];

function renderERSChart(g, W) {
    const totalH = 500;
    const margin = { top: 28, right: 112, bottom: 52, left: 68 };
    const chartW = W - margin.left - margin.right;
    const chartH = totalH - margin.top  - margin.bottom;

    const chartG = g.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([2010, 2021])
      .range([0, chartW]);

    const allRates = groups.flatMap(gr => gr.values.map(v => v.rate));
    const yScale = d3.scaleLinear()
      .domain([30, 80])
      .range([chartH, 0])
      .nice();

    yScale.ticks(6).forEach(tick => {
      chartG.append('line')
        .attr('x1', 0).attr('x2', chartW)
        .attr('y1', yScale(tick)).attr('y2', yScale(tick))
        .attr('stroke', tick === 0 ? '#ccc' : '#e8e4dc')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', tick === 0 ? 'none' : '3,4');
    });

    const xTickVals = [2011.5, 2015.5, 2019.5];
    const xTickLabels = {
      2011.5: '2010–2013',
      2015.5: '2014–2017',
      2019.5: '2018–2021',
    };

    const xAxis = chartG.append('g')
      .attr('transform', `translate(0,${chartH})`)
      .call(
        d3.axisBottom(xScale)
          .tickValues(xTickVals)
          .tickFormat(d => xTickLabels[d])
          .tickSize(10)
      );
    xAxis.select('.domain').attr('stroke', '#ccc');
    xAxis.selectAll('.tick line').attr('stroke', '#ccc');
    xAxis.selectAll('text')
      .style('font-family', "'Georgia', monospace")
      .style('font-size', '16px')
      .style('fill', '#666');

    chartG.append('text')
      .attr('x', chartW / 2)
      .attr('y', chartH + 46)
      .attr('text-anchor', 'middle')
      .style('font-family', "'Georgia', sans-serif")
      .style('font-size', '18px')
      .style('fill', '#888')
      .text('Reporting Period');

    const yAxis = chartG.append('g')
      .call(
        d3.axisLeft(yScale)
          .ticks(6)
          .tickFormat(d => d)
          .tickSize(10)
      );
    yAxis.select('.domain').attr('stroke', '#ccc');
    yAxis.selectAll('.tick line').attr('stroke', '#ccc');
    yAxis.selectAll('text')
      .style('font-family', "'Georgia', monospace")
      .style('font-size', '16px')
      .style('fill', '#666');

    chartG.append('text')
      .attr('x', chartW / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .style('font-family', "'Georgia', sans-serif")
      .style('font-size', '25px')
      .style('fill', '#1a1917')
      .text('Overdose Deaths by Economic Risk Score Group');

    chartG.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(chartH / 2))
      .attr('y', -54)
      .attr('text-anchor', 'middle')
      .style('font-family', "'Georgia', sans-serif")
      .style('font-size', '18px')
      .style('fill', '#888')
      .text('Overdose Deaths per 100,000 Residents');

    const lineGen = d3.line()
      .x(d => xScale(d.year))
      .y(d => yScale(d.rate));

    const dotLabelSide = {
      ers1: ['below', 'above', 'below'],
      ers2: ['below', 'below', 'above'],
      ers3: ['above', 'above', 'above'],
      ers4: ['below', 'below', 'below'],
    };

    const segLabelSide = {
      ers1: ['above', 'below'],
      ers2: ['above', 'above'],
      ers3: ['below', 'above'],
      ers4: ['below', 'above'],
    };

    const endLabelDy = { ers1: -7, ers2: +9, ers3: -4, ers4: +4 };

    groups.forEach(gr => {
      const lg = chartG.append('g');

      lg.append('path')
        .datum(gr.values)
        .attr('fill', 'none')
        .attr('stroke', gr.color)
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-dasharray', gr.dashed ? '6,4' : 'none')
        .attr('d', lineGen);

      gr.values.forEach((v, i) => {
        if (i === 0) return;
        const a    = gr.values[i - 1];
        const diff = v.rate - a.rate;
        const pct  = ((diff / a.rate) * 100).toFixed(0);
        const sign = diff >= 0 ? '+' : '';
        const mx   = xScale((a.year + v.year) / 2);
        const my   = yScale((a.rate  + v.rate) / 2);
        const dy   = segLabelSide[gr.id][i - 1] === 'above' ? -13 : 18;

        lg.append('text')
          .attr('x', mx)
          .attr('y', my + dy)
          .attr('text-anchor', 'middle')
          .style('font-family', "'Georgia', monospace")
          .style('font-size', '12px')
          .style('fill', gr.color)
          .style('font-weight', '500')
          .text(`${sign}${diff.toFixed(1)} (${sign}${pct}%)`);
      });

      gr.values.forEach((v, i) => {
        lg.append('circle')
          .attr('cx', xScale(v.year))
          .attr('cy', yScale(v.rate))
          .attr('r', 5)
          .attr('fill', gr.color)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);

        const dy = dotLabelSide[gr.id][i] === 'above' ? -13 : 18;
        lg.append('text')
          .attr('x', xScale(v.year))
          .attr('y', yScale(v.rate) + dy)
          .attr('text-anchor', 'middle')
          .style('font-family', "'Georgia', monospace")
          .style('font-size', '12px')
          .style('fill', gr.color)
          .style('font-weight', '500')
          .text(v.rate.toFixed(1));
      });

      const last = gr.values.at(-1);
      lg.append('text')
        .attr('x', xScale(last.year) + 12)
        .attr('y', yScale(last.rate) + endLabelDy[gr.id] + 4)
        .style('font-family', "'Georgia', monospace")
        .style('font-size', '12px')
        .style('fill', gr.color)
        .style('font-weight', '500')
        .text(gr.label);
      });
  }


// start of poem code
const stanzas = [
  {
    lines: [
      'The numbers rise, and rise again',
      'Each spike means more souls lost',
      'Lives gone at a heavy cost',
      'The line goes up year by year',
      'The loss never feels less severe.',
    ]
  },
  {
    lines: [
      'The smell of destitution pulls me in',
      'What little you have, becomes mine',
      'Should you eat this week?',
      'The itch hurts more than hunger, every time.',
    ],
    visualHeight: 500,
    renderVisual: (g, W) => renderERSChart(g, W)
  },
  {
    lines: [
      'When help is few, the counts run high',
      'Gaps in care let risk pass by',
      'Access decides who lives, who dies.',
      'Availability shapes the chance to survive.',
      'Timely care matters.',
    ]
  },
  {
    lines: [
      'As the masses grow more educated',
      'My influence fades, the itch is scratched',
      'Some, trapped in a vicious cycle',
      'Never learn better',
    ]
  },
];

// layout constants
const SVG_W          = 1200;
const MARGIN_R       = 0;
const MARGIN_L       = 0;
const MARGIN_TOP     = 250;
const margin_bottom  = 250;
const TEXT_W         = SVG_W - MARGIN_L - MARGIN_R;
const VISUAL_PADDING = 40;
const TEXT_COLUMN_W = 400;
const GAP           = 60;

// Typography sizes (px)
const LINE_SIZE      = 20;
const LEADING        = 32;
const STANZA_GAP     = 500;
const RULE_MARGIN    = 250;

function cleanNumber(value) {
  if (value === null || value === undefined) return 0;
  const str = String(value).toLowerCase().trim();
  if (str === "" || str === "suppressed" || str === "na" || str === "n/a") return 0;
  return +str.replace(/,/g, "") || 0;
}

function stanzaHeight(s) {
  const textH = LEADING + s.lines.length * LEADING;
  const vizH  = s.visualHeight ?? 0;
  return vizH > 0 ? Math.max(textH, vizH) : textH;
}

Promise.all([
  d3.csv("ga_state_clean.csv"),
  d3.csv("clean_drug_overdose_death.csv"),
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json")
]).then(([gaData, overdoseData, us]) => {
  const facilityCol = "Number of Mental Health Facilities (As of March 2023)";
  const rateCol = "Crude Opioid Death Rate (2018-2021)";
  const countCol = "Opioid Death Count (2018-2021)";

  gaData.forEach(d => {
    d.county = d.county.replace(" County", "");
    d[facilityCol] = d[facilityCol] === "Suppressed" ? null : +d[facilityCol].replace("*", "");
    d[rateCol]     = d[rateCol]     === "Suppressed" ? null : +d[rateCol].replace("*", "");
    d[countCol]    = d[countCol]    === "Suppressed" ? null : +d[countCol].replace("*", "");
  });

  const plotData = gaData.filter(d => d[facilityCol] != null && d[rateCol] != null && d[countCol] != null);

  stanzas[0].visualHeight = 500;
  stanzas[0].renderVisual = (g, W) => renderLineChart(g, W, overdoseData);

  stanzas[3].visualHeight = 800;
  stanzas[3].renderVisual = (g, W) => renderMapChart(g, W, overdoseData, us);

  stanzas[2].visualHeight = 500;
  stanzas[2].renderVisual = (g, W) => renderMentalHealth(g, W, plotData);

  const totalContentH = stanzas.reduce((acc, s, i) => {
    return acc + stanzaHeight(s) + (i < stanzas.length - 1 ? STANZA_GAP : 0);
  }, 0);

  const SVG_H = MARGIN_TOP + totalContentH + 24;

  const svg = d3.select('#poem-svg')
    .attr('viewBox', `0 0 ${SVG_W} ${SVG_H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  let cursorY = MARGIN_TOP;

  stanzas.forEach((stanza, si) => {
    const g = svg.append('g')
      .attr('transform', `translate(0, ${cursorY})`);

    stanza.lines.forEach((line, li) => {
      const isLast = li === stanza.lines.length - 1;

      g.append('text')
        .attr('x', MARGIN_L)
        .attr('y', LEADING + li * LEADING)
        .style('font-family', "'EB Garamond', serif")
        .style('font-size', `${LINE_SIZE}px`)
        .style('font-style', 'normal')
        .style('font-weight', '400')
        .style('letter-spacing', '0')
        .text(line);
    });

    if (stanza.renderVisual) {
      const vizG = g.append('g')
        .attr('transform', `translate(${TEXT_COLUMN_W + GAP}, 0)`);
      stanza.renderVisual(vizG, SVG_W - TEXT_COLUMN_W - GAP);
    }

    if (si < stanzas.length - 1) {
      const ruleY = stanzaHeight(stanza) + RULE_MARGIN;

      g.append('line')
        .attr('x1', MARGIN_L)
        .attr('x2', SVG_W - MARGIN_R)
        .attr('y1', ruleY)
        .attr('y2', ruleY)
        .attr('stroke', '#e0dbd2')
        .attr('stroke-width', 0.75);
    }

    cursorY += stanzaHeight(stanza) + (si < stanzas.length - 1 ? STANZA_GAP : 0);
  });
});
