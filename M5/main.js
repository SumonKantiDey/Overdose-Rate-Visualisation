// PAGINATION
const TOTAL_SLIDES = 5;   // 0 = title, 1–4 = stanza+viz pairs
let currentSlide = 0;

const slides   = document.querySelectorAll('.slide');
const btnBack  = document.getElementById('btn-back');
const btnNext  = document.getElementById('btn-next');
const dotsWrap = document.getElementById('nav-dots');

// Build dot indicators
for (let i = 0; i < TOTAL_SLIDES; i++) {
  const dot = document.createElement('button');
  dot.className = 'dot' + (i === 0 ? ' active' : '');
  dot.setAttribute('aria-label', `Go to slide ${i}`);
  dot.addEventListener('click', () => goTo(i));
  dotsWrap.appendChild(dot);
}

function goTo(n) {
  slides[currentSlide].classList.remove('active');
  dotsWrap.children[currentSlide].classList.remove('active');
  currentSlide = Math.max(0, Math.min(TOTAL_SLIDES - 1, n));
  slides[currentSlide].classList.add('active');
  dotsWrap.children[currentSlide].classList.add('active');
  btnBack.disabled = currentSlide === 0;
  btnNext.disabled = currentSlide === TOTAL_SLIDES - 1;

  // Render viz2 once it first becomes visible.
  // requestAnimationFrame waits one paint cycle so getBoundingClientRect()
  // returns real pixel dimensions instead of 0.
  if (currentSlide === 2 && !viz2Rendered) {
    requestAnimationFrame(() => renderViz2());
  }
}

btnBack.addEventListener('click', () => goTo(currentSlide - 1));
btnNext.addEventListener('click', () => goTo(currentSlide + 1));

// Keyboard arrow navigation
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  goTo(currentSlide + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    goTo(currentSlide - 1);
});

// VISUALIZATION 2
// Overdose Deaths per 100,000 by ERS Group
// Colors matched to existing static chart:
//   ERS 1 → dark green  #2d6a2d
//   ERS 2 → gold/yellow #c9a800
//   ERS 3 → orange      #e07800
//   ERS 4 → dark red    #8b1a1a  (dashed — partial data)

// ── Data ──────────────────────────────────────────────────────────────────
// Deaths per 100,000 residents, summed over non-suppressed counties per ERS group.
// Period midpoints as x-positions so axis labels can show full period ranges.
//
// Vertical order by period (high → low):
//   2010–2013: ERS3=53.74 > ERS1=46.24 > ERS4=39.68 > ERS2=38.23
//   2014–2017: ERS1=61.17 > ERS3=53.00 > ERS2=48.93 > ERS4=43.87
//   2018–2021: ERS3=74.38 > ERS2=63.50 > ERS1=63.01 > ERS4=59.87

const VIZ2_GROUPS = [
  {
    id: 'ers1', label: 'ERS 1', sub: 'Lowest risk (26 counties)',
    color: '#2d6a2d', dashed: false,
    values: [
      { period: '2010–2013', year: 2011.5, rate: 46.24 },
      { period: '2014–2017', year: 2015.5, rate: 61.17 },
      { period: '2018–2021', year: 2019.5, rate: 63.01 },
    ]
  },
  {
    id: 'ers2', label: 'ERS 2', sub: 'Moderate risk (32 counties)',
    color: '#c9a800', dashed: false,
    values: [
      { period: '2010–2013', year: 2011.5, rate: 38.23 },
      { period: '2014–2017', year: 2015.5, rate: 48.93 },
      { period: '2018–2021', year: 2019.5, rate: 63.50 },
    ]
  },
  {
    id: 'ers3', label: 'ERS 3', sub: 'Elevated risk (39 counties)',
    color: '#e07800', dashed: false,
    values: [
      { period: '2010–2013', year: 2011.5, rate: 53.74 },
      { period: '2014–2017', year: 2015.5, rate: 53.00 },
      { period: '2018–2021', year: 2019.5, rate: 74.38 },
    ]
  },
  {
    id: 'ers4', label: 'ERS 4', sub: 'Highest risk (44 counties) †',
    color: '#8b1a1a', dashed: true,
    values: [
      { period: '2010–2013', year: 2011.5, rate: 39.68 },
      { period: '2014–2017', year: 2015.5, rate: 43.87 },
      { period: '2018–2021', year: 2019.5, rate: 59.87 },
    ]
  },
];

// Dot label placement (above/below) per period index, per group
// Vertical rank per period:
//   [0] 2010–13: ERS3 > ERS1 > ERS4 > ERS2
//   [1] 2014–17: ERS1 > ERS3 > ERS2 > ERS4
//   [2] 2018–21: ERS3 > ERS2 > ERS1 > ERS4
const DOT_SIDE = {
  ers1: ['below', 'above', 'below'],
  ers2: ['below', 'below', 'above'],
  ers3: ['above', 'above', 'above'],
  ers4: ['below', 'below', 'below'],
};

// Segment midpoint label placement
const SEG_SIDE = {
  ers1: ['above', 'below'],
  ers2: ['above', 'above'],
  ers3: ['below', 'above'],
  ers4: ['below', 'above'],
};

// End-label y-offsets (ERS1 & ERS2 nearly converge at 2018–2021)
const END_DY = { ers1: -7, ers2: +12, ers3: -5, ers4: +5 };

let viz2Rendered = false;

// Refs for zoom updates
const v2refs = { lines: {}, circs: {}, endLbls: {}, segHits: {}, dotLbls: {}, segLbls: {} };
let v2isolated = null;
let v2plotG, v2xScale, v2yScale, v2gridG, v2xAxisG, v2yAxisG, v2svg, v2zoom;

function renderViz2() {
  viz2Rendered = true;

  const svgEl = document.getElementById('viz2-svg');
  const rect  = svgEl.getBoundingClientRect();
  // Use measured dimensions; fall back to sensible defaults if still 0
  const W_px  = rect.width  > 0 ? rect.width  : 800;
  const H_px  = rect.height > 0 ? rect.height : 480;

  // Use actual pixel dimensions for viewBox so everything fills the pane
  const totalW = W_px;
  const totalH = H_px;
  const margin = { top: 32, right: 96, bottom: 60, left: 70 };
  const W = totalW - margin.left - margin.right;
  const H = totalH - margin.top  - margin.bottom;

  v2svg = d3.select('#viz2-svg')
    .attr('viewBox', `0 0 ${totalW} ${totalH}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // Clip path
  v2svg.append('defs')
    .append('clipPath').attr('id', 'v2clip')
    .append('rect')
      .attr('x', 0).attr('y', -margin.top)
      .attr('width', W)
      .attr('height', H + margin.top + margin.bottom);

  const g = v2svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Base scales
  v2xScale = d3.scaleLinear().domain([2010, 2021]).range([0, W]);
  v2yScale = d3.scaleLinear().domain([30, 80]).range([H, 0]).nice();

  // Gridlines
  v2gridG = g.append('g');
  function drawGrid(yS) {
    v2gridG.selectAll('line').remove();
    yS.ticks(6).forEach(t => {
      v2gridG.append('line')
        .attr('x1', 0).attr('x2', W)
        .attr('y1', yS(t)).attr('y2', yS(t))
        .attr('stroke', '#c8c8c8').attr('stroke-width', 0.8)
        .attr('stroke-dasharray', '4,4');
    });
  }
  drawGrid(v2yScale);

  // Axes
  const xTickVals   = [2011.5, 2015.5, 2019.5];
  const xTickLabels = { 2011.5: '2010–2013', 2015.5: '2014–2017', 2019.5: '2018–2021' };

  v2xAxisG = g.append('g').attr('transform', `translate(0,${H})`);
  v2yAxisG = g.append('g');

  function drawX(xS) {
    v2xAxisG.call(
      d3.axisBottom(xS)
        .tickValues(xTickVals)
        .tickFormat(d => xTickLabels[d] || '')
        .tickSize(6)
    );
    v2xAxisG.select('.domain').attr('stroke', '#aaa');
    v2xAxisG.selectAll('.tick line').attr('stroke', '#aaa');
    v2xAxisG.selectAll('text')
      .style('font-family', "'EB Garamond', serif")
      .style('font-size', '14px').style('fill', '#555');
  }

  function drawY(yS) {
    v2yAxisG.call(d3.axisLeft(yS).ticks(6).tickFormat(d => d).tickSize(5));
    v2yAxisG.select('.domain').attr('stroke', '#aaa');
    v2yAxisG.selectAll('.tick line').attr('stroke', '#aaa');
    v2yAxisG.selectAll('text')
      .style('font-family', "'EB Garamond', serif")
      .style('font-size', '14px').style('fill', '#555');
  }

  drawX(v2xScale);
  drawY(v2yScale);

  // Axis labels
  g.append('text')
    .attr('x', W / 2).attr('y', H + 52)
    .attr('text-anchor', 'middle')
    .style('font-family', "'EB Garamond', serif")
    .style('font-size', '15px').style('font-weight', 'bold').style('fill', '#555')
    .text('Reporting Period');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(H / 2)).attr('y', -54)
    .attr('text-anchor', 'middle')
    .style('font-family', "'EB Garamond', serif")
    .style('font-size', '14px').style('font-weight', 'bold').style('fill', '#555')
    .text('Overdose Deaths per 100,000 Residents');

  g.append('text')
    .attr('x', 3).attr('y', v2yScale(30) - 5)
    .style('font-family', "'EB Garamond', serif")
    .style('font-size', '9px').style('fill', '#bbb')
    .text('axis starts at 30');

  // Line generator factory
  function makeLine(xS, yS) {
    return d3.line().x(d => xS(d.year)).y(d => yS(d.rate)).curve(d3.curveLinear);
  }

  // Plot group (clipped)
  v2plotG = g.append('g').attr('clip-path', 'url(#v2clip)');

  VIZ2_GROUPS.forEach(gr => {
    const lg = v2plotG.append('g').attr('class', `v2g-${gr.id}`);

    // Line
    v2refs.lines[gr.id] = lg.append('path')
      .datum(gr.values)
      .attr('fill', 'none')
      .attr('stroke', gr.color)
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-dasharray', gr.dashed ? '8,5' : 'none')
      .attr('d', makeLine(v2xScale, v2yScale));

    // Segment labels
    const segLbls = [];
    gr.values.forEach((v, i) => {
      if (i === 0) return;
      const a    = gr.values[i - 1];
      const diff = v.rate - a.rate;
      const pct  = ((diff / a.rate) * 100).toFixed(0);
      const sign = diff >= 0 ? '+' : '';
      const mx   = v2xScale((a.year + v.year) / 2);
      const my   = v2yScale((a.rate  + v.rate) / 2);
      const dy   = SEG_SIDE[gr.id][i - 1] === 'above' ? -15 : 20;

      const lbl = lg.append('text')
        .attr('x', mx).attr('y', my + dy)
        .attr('text-anchor', 'middle')
        .style('font-family', "'EB Garamond', serif")
        .style('font-size', '12px').style('fill', gr.color).style('font-weight', '500')
        .text(`${sign}${diff.toFixed(1)} (${sign}${pct}%)`);

      segLbls.push({ lbl, a, b: v, dy });
    });
    v2refs.segLbls[gr.id] = segLbls;

    // Invisible segment hit lines (tooltip triggers)
    const segHits = [];
    gr.values.forEach((v, i) => {
      if (i === 0) return;
      const a    = gr.values[i - 1];
      const diff = v.rate - a.rate;
      const pct  = ((diff / a.rate) * 100).toFixed(1);
      const sign = diff >= 0 ? '+' : '';

      const hit = lg.append('line')
        .attr('x1', v2xScale(a.year)).attr('y1', v2yScale(a.rate))
        .attr('x2', v2xScale(v.year)).attr('y2', v2yScale(v.rate))
        .attr('stroke', 'transparent').attr('stroke-width', 20)
        .style('cursor', 'crosshair')
        .on('mouseenter', evt => tipShow(evt, gr.color, gr.label,
          `${a.period} → ${v.period}`, null,
          `${sign}${diff.toFixed(2)} per 100k  (${sign}${pct}%)`))
        .on('mousemove', tipMove)
        .on('mouseleave', tipHide);

      segHits.push({ hit, a, b: v });
    });
    v2refs.segHits[gr.id] = segHits;

    // Dots + dot labels
    const circs = [], dotLbls = [];
    gr.values.forEach((v, i) => {
      const circ = lg.append('circle')
        .attr('cx', v2xScale(v.year)).attr('cy', v2yScale(v.rate))
        .attr('r', 6).attr('fill', gr.color)
        .attr('stroke', '#fff').attr('stroke-width', 2.5)
        .style('cursor', 'pointer')
        .on('mouseenter', function(evt) {
          d3.select(this).attr('r', 9);
          tipShow(evt, gr.color, gr.label, v.period, `${v.rate.toFixed(1)} per 100k`, null);
        })
        .on('mousemove', tipMove)
        .on('mouseleave', function() { d3.select(this).attr('r', 6); tipHide(); });

      circs.push({ circ, v });

      const dy  = DOT_SIDE[gr.id][i] === 'above' ? -15 : 20;
      const lbl = lg.append('text')
        .attr('x', v2xScale(v.year)).attr('y', v2yScale(v.rate) + dy)
        .attr('text-anchor', 'middle')
        .style('font-family', "'EB Garamond', serif")
        .style('font-size', '13px').style('fill', gr.color).style('font-weight', '500')
        .text(v.rate.toFixed(1));

      dotLbls.push({ lbl, v, dy });
    });
    v2refs.circs[gr.id]   = circs;
    v2refs.dotLbls[gr.id] = dotLbls;

    // End-of-line label
    const last = gr.values.at(-1);
    v2refs.endLbls[gr.id] = lg.append('text')
      .attr('x', v2xScale(last.year) + 10)
      .attr('y', v2yScale(last.rate) + END_DY[gr.id] + 4)
      .style('font-family', "'EB Garamond', serif")
      .style('font-size', '14px').style('fill', gr.color).style('font-weight', '500')
      .text(gr.label);
  });

  // Legend
  const legEl = document.getElementById('viz2-legend');
  VIZ2_GROUPS.forEach(gr => {
    const item = document.createElement('div');
    item.className = 'leg-item';
    item.dataset.id = gr.id;
    item.innerHTML = `
      <div class="leg-swatch ${gr.dashed ? 'dashed' : ''}" style="border-color:${gr.color}"></div>
      <div class="leg-dot" style="background:${gr.color}"></div>
      <span class="leg-label" style="color:${gr.color}">${gr.label}</span>
      <span class="leg-sub">${gr.sub}</span>
    `;
    item.addEventListener('click', () => {
      v2isolated = (v2isolated === gr.id) ? null : gr.id;
      VIZ2_GROUPS.forEach(g2 => {
        const on = v2isolated === null || v2isolated === g2.id;
        v2plotG.select(`.v2g-${g2.id}`).transition().duration(180).style('opacity', on ? 1 : 0.1);
        const el = legEl.querySelector(`[data-id="${g2.id}"]`);
        el.classList.toggle('faded',    !on);
        el.classList.toggle('isolated', v2isolated === g2.id);
      });
    });
    legEl.appendChild(item);
  });

  // Zoom
  v2zoom = d3.zoom().scaleExtent([0.8, 14]).on('zoom', function(event) {
    const t  = event.transform;
    const xS = t.rescaleX(v2xScale);
    const yS = t.rescaleY(v2yScale);

    drawX(xS); drawY(yS); drawGrid(yS);
    const lf = makeLine(xS, yS);

    VIZ2_GROUPS.forEach(gr => {
      v2refs.lines[gr.id].attr('d', lf(gr.values));

      v2refs.segHits[gr.id].forEach(({ hit, a, b }) => {
        hit.attr('x1', xS(a.year)).attr('y1', yS(a.rate))
           .attr('x2', xS(b.year)).attr('y2', yS(b.rate));
      });
      v2refs.segLbls[gr.id].forEach(({ lbl, a, b, dy }) => {
        lbl.attr('x', xS((a.year + b.year) / 2))
           .attr('y', yS((a.rate  + b.rate) / 2) + dy);
      });
      v2refs.circs[gr.id].forEach(({ circ, v }) => {
        circ.attr('cx', xS(v.year)).attr('cy', yS(v.rate));
      });
      v2refs.dotLbls[gr.id].forEach(({ lbl, v, dy }) => {
        lbl.attr('x', xS(v.year)).attr('y', yS(v.rate) + dy);
      });
      const last = gr.values.at(-1);
      v2refs.endLbls[gr.id]
        .attr('x', xS(last.year) + 10)
        .attr('y', yS(last.rate) + END_DY[gr.id] + 4);
    });
  });

  v2svg.call(v2zoom);

  document.getElementById('z-in').onclick    = () => v2svg.transition().duration(280).call(v2zoom.scaleBy, 1.5);
  document.getElementById('z-out').onclick   = () => v2svg.transition().duration(280).call(v2zoom.scaleBy, 1/1.5);
  document.getElementById('z-reset').onclick = () => v2svg.transition().duration(360).call(v2zoom.transform, d3.zoomIdentity);
}

// Tooltip
const tip = document.getElementById('viz2-tip');

function tipShow(evt, color, group, period, value, change) {
  let h = `<div class="tt-group" style="color:${color}">${group}</div>`;
  h    += `<div class="tt-period">${period}</div>`;
  if (value)  h += `<div class="tt-value"  style="color:${color}">${value}</div>`;
  if (change) h += `<div class="tt-change">${change}</div>`;
  tip.innerHTML = h;
  tip.classList.add('on');
  tipMove(evt);
}

function tipMove(evt) {
  const pad = 14;
  let x = evt.clientX + pad, y = evt.clientY - 10;
  if (x + 220 > window.innerWidth) x = evt.clientX - 220 - pad;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

function tipHide() { tip.classList.remove('on'); }