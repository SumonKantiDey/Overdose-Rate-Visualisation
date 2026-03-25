// Set up margins and dimensions
const margin = { top: 60, right: 30, bottom: 80, left: 100 };
const width = 900 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG
const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Add title
svg.append("text")
  .attr("x", width / 2)
  .attr("y", -margin.top + 15)
  .attr("text-anchor", "middle")
  .style("font-size", "20px")
  .style("font-weight", "bold")
  .style("fill", "#2c3e50")
  .text("Georgia Counties: Mental Health Facility Availability vs Opioid Mortality");

// Tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Load data
d3.csv("../ga_state_clean.csv").then(data => {
  // Clean data
  const facilityCol = "Number of Mental Health Facilities (As of March 2023)";
  const rateCol = "Crude Opioid Death Rate (2018-2021)";
  const countCol = "Opioid Death Count (2018-2021)";

  data.forEach(d => {
    d.county = d.county.replace(" County", "");
    d[facilityCol] = d[facilityCol] === "Suppressed" ? null : +d[facilityCol].replace("*", "");
    d[rateCol] = d[rateCol] === "Suppressed" ? null : +d[rateCol].replace("*", "");
    d[countCol] = d[countCol] === "Suppressed" ? null : +d[countCol].replace("*", "");
  });

  // Filter out nulls
  const plotData = data.filter(d => d[facilityCol] != null && d[rateCol] != null && d[countCol] != null);

  // Scales
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

  // Axes
  svg.append("g")
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

  svg.append("g")
    .call(d3.axisLeft(yScale)
      .ticks(8)
      .tickSizeOuter(0)
    );

  // Grid lines
  svg.selectAll("line.horizontalGrid")
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

  svg.selectAll("line.verticalGrid")
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

  // Median lines for quadrants
  const medianFac = d3.median(plotData, d => d[facilityCol]);
  const medianRate = d3.median(plotData, d => d[rateCol]);

  svg.append("line")
    .attr("x1", xScale(medianFac))
    .attr("x2", xScale(medianFac))
    .attr("y1", 0)
    .attr("y2", height)
    .style("stroke", "gray")
    .style("stroke-dasharray", "5,5")
    .style("opacity", 0.5);

  svg.append("line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", yScale(medianRate))
    .attr("y2", yScale(medianRate))
    .style("stroke", "gray")
    .style("stroke-dasharray", "5,5")
    .style("opacity", 0.5);

  // Quadrant labels
  svg.append("text")
    .attr("x", xScale(medianFac) + 100)
    .attr("y", 20)
    .style("font-size", "12px")
    .style("fill", "gray")
    .style("opacity", 0.7)
    .text("More facilities");

  svg.append("text")
    .attr("x", 10)
    .attr("y", yScale(medianRate) - 10)
    .style("font-size", "12px")
    .style("fill", "gray")
    .style("opacity", 0.7)
    .text("Higher severity");

  // X axis label
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10)
    .text("Mental Health Facilities (2023)");

  // Y axis label
  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -height / 2)
    .text("Crude Opioid Death Rate (2018–2021)");

  // Find top counties
  const topRate = plotData.sort((a, b) => b[rateCol] - a[rateCol]).slice(0, 3);
  const topCount = plotData.sort((a, b) => b[countCol] - a[countCol]).slice(0, 3);
  const topFacility = plotData.sort((a, b) => b[facilityCol] - a[facilityCol]).slice(0, 2);
  const toLabel = [...new Set([...topRate, ...topCount, ...topFacility])];

  // Circles
  const circles = svg.selectAll("circle")
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

  // Add collision detection to prevent overlapping
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

  // Labels with connector lines
  // Add connector lines first (so they appear behind text)
  svg.selectAll("line.connector")
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

  // Add label backgrounds for better readability
  svg.selectAll("rect.label-bg")
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

  // Add labels
  svg.selectAll("text.label")
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

  // Legend for bubble sizes
  const legendCounts = [25, 100, 250];
  const legendSizes = legendCounts.map(c => sizeScale(c));

  const legend = svg.append("g")
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

  // Explanation text
  const explanation = svg.append("g")
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
});
