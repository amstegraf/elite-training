document.addEventListener('DOMContentLoaded', () => {
    const rawData = document.getElementById('progress-data');
    if (!rawData) return;
    
    let data;
    try {
        data = JSON.parse(rawData.textContent);
    } catch (e) {
        console.error("Failed to parse progress data", e);
        return;
    }

    if (!data.labels || data.labels.length === 0) {
        console.log("No progress data available.");
    }

    // Chart Design System integration
    Chart.defaults.font.family = '"Outfit", "Inter", system-ui, sans-serif';
    Chart.defaults.color = '#8e9199'; // var(--muted)
    Chart.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.04)'; // var(--border)
    
    const brandColor = '#ff694b'; 
    const brandColorLight = 'rgba(255, 105, 75, 0.2)';
    const prColor = '#9bc263'; 
    const prColorLight = 'rgba(155, 194, 99, 0.2)';
    const frColor = '#ff8b9b'; 
    const frColorLight = 'rgba(255, 139, 155, 0.2)';
    const darkAcc = '#1a1b1f';

    // Shared options for secondary line charts (clean sparkline-esque with axes)
    const commonLineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(26, 27, 31, 0.9)',
                titleFont: { size: 13, family: '"Outfit"' },
                bodyFont: { size: 14, family: '"Mono"' },
                padding: 12,
                cornerRadius: 8,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                border: { display: false },
                grid: { display: false } // removed for cleaner look
            },
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: { color: 'rgba(142, 145, 153, 0.6)' } // Faded bottom labels
            }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        elements: {
            line: { tension: 0.4, borderWidth: 3 }, // smooth curved lines
            point: { radius: 0, hoverRadius: 6, borderWidth: 2, backgroundColor: '#fff' } // Hidden points until hover
        }
    };

    const cloneObj = (obj) => JSON.parse(JSON.stringify(obj));
    const getValid = arr => (arr || []).filter(v => v != null);

    const SVG_TREND_UP = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>';
    const SVG_TREND_DOWN = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>';

    const setHeroTrendIcon = (elId, trend) => {
        const el = document.getElementById(elId);
        if (!el) return;
        if (trend === 'up') {
            el.style.color = '#22c55e';
            el.innerHTML = SVG_TREND_UP;
            el.removeAttribute('title');
        } else if (trend === 'down') {
            el.style.color = '#ef4444';
            el.innerHTML = SVG_TREND_DOWN;
            el.removeAttribute('title');
        } else {
            el.style.color = 'var(--muted)';
            el.innerHTML = '';
            el.setAttribute('title', 'Flat or not enough sessions to establish a trend');
        }
    };

    /** Big-number callouts: always the chronologically last session (matches last chart point). */
    const setMetricFromLastSession = (id, arr, suffix = '', format = null) => {
        const el = document.getElementById(id);
        if (!el || !arr || arr.length === 0) return;
        const v = arr[arr.length - 1];
        if (v == null || (typeof v === 'number' && Number.isNaN(v))) {
            el.textContent = '—';
            return;
        }
        const out = format ? format(v) : (v % 1 !== 0 ? Math.round(v * 10) / 10 : v);
        el.textContent = out + suffix;
    };

    // Helper for sparklines where "latest meaningful" is still useful
    const setMetricText = (id, validArray, suffix = '') => {
        const el = document.getElementById(id);
        if (!el || !validArray || validArray.length === 0) return;
        let latest = validArray[validArray.length - 1];
        if (latest % 1 !== 0) latest = Math.round(latest * 10) / 10;
        el.textContent = latest + suffix;
    };

    // Helper to create gradient
    const makeGradient = (ctxId, startColor, endColor = 'rgba(255,255,255,0)') => {
        const ctx = document.getElementById(ctxId);
        if(!ctx) return startColor;
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, startColor);
        gradient.addColorStop(1, endColor);
        return gradient;
    };

    // 1. Avg Balls Cleared (Primary KPI) — null when racks lack usable balls_cleared (matches session report).
    const ctxAvg = document.getElementById('chart-avg-balls');
    if (ctxAvg && data.avg_balls_cleared && data.labels && data.labels.length) {
        const avgSeries = data.avg_balls_cleared;
        if (avgSeries.some((v) => v != null)) {
            setMetricFromLastSession('metric-avg-balls', avgSeries);
            const avgOpt = cloneObj(commonLineOptions);
            avgOpt.scales.y.max = 9;
            new Chart(ctxAvg, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: 'Avg balls / rack',
                        data: avgSeries,
                        borderColor: prColor,
                        backgroundColor: makeGradient('chart-avg-balls', prColorLight),
                        fill: true,
                        spanGaps: false
                    }]
                },
                options: avgOpt
            });
        }
    }

    // 2. Flow efficiency
    const ctxConv = document.getElementById('chart-conversion');
    const flowSeries = data.flow_efficiency || data.conversion_efficiency;
    if (ctxConv && flowSeries) {
        setMetricFromLastSession(
            'metric-flow-efficiency',
            flowSeries.map((v) => (v == null ? null : Math.round(v * 1000) / 10)),
            '%'
        );
        
        const convOpt = cloneObj(commonLineOptions);
        convOpt.scales.y.max = 100;
        new Chart(ctxConv, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Flow efficiency %',
                    data: flowSeries.map(v => v == null ? null : Math.round(v * 1000) / 10),
                    borderColor: '#0284c7',
                    backgroundColor: makeGradient('chart-conversion', 'rgba(2, 132, 199, 0.25)'),
                    fill: true
                }]
            },
            options: convOpt
        });
    }

    // 3. Best Run
    const ctxRun = document.getElementById('chart-best-run');
    if (ctxRun && data.best_runs) {
        setMetricFromLastSession('metric-best-run', data.best_runs);
        new Chart(ctxRun, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Best Run',
                    data: data.best_runs,
                    borderColor: brandColor,
                    backgroundColor: makeGradient('chart-best-run', brandColorLight),
                    fill: true
                }]
            },
            options: commonLineOptions
        });
    }

    // 4. Recovery Rate
    const ctxRec = document.getElementById('chart-recovery');
    if (ctxRec && data.recovery_pct) {
        setMetricFromLastSession('metric-recovery', data.recovery_pct, '%');
        const recOpt = cloneObj(commonLineOptions);
        recOpt.plugins.legend = { display: true, position: 'top' };
        recOpt.scales.y.max = 100;
        new Chart(ctxRec, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Recovery %',
                        data: data.recovery_pct,
                        borderColor: '#7c3aed',
                        backgroundColor: makeGradient('chart-recovery', 'rgba(124, 58, 237, 0.2)'),
                        fill: true
                    },
                    {
                        label: 'Failed recovery %',
                        data: data.failed_recovery_pct || [],
                        borderColor: '#dc2626',
                        backgroundColor: 'transparent', // cleaner without fill
                        fill: false,
                        borderDash: [5, 4]
                    }
                ]
            },
            options: recOpt
        });
    }

    // 5. Position vs Speed
    const ctxPosSpdGran = document.getElementById('chart-position-speed-granular');
    const labelsGran = data.labels || [];
    let posPctBad = Array.isArray(data.position_tag_pct_of_bad_play) ? data.position_tag_pct_of_bad_play : [];
    let spdPctBad = Array.isArray(data.speed_tag_pct_of_bad_play) ? data.speed_tag_pct_of_bad_play : [];
    while (posPctBad.length < labelsGran.length) posPctBad.push(null);
    while (spdPctBad.length < labelsGran.length) spdPctBad.push(null);
    if (ctxPosSpdGran && (posPctBad.some(v => v != null) || spdPctBad.some(v => v != null))) {
        const granOpt = cloneObj(commonLineOptions);
        granOpt.plugins.legend = { display: true, position: 'top' };
        granOpt.scales.y.max = 100;
        new Chart(ctxPosSpdGran, {
            type: 'line',
            data: {
                labels: labelsGran,
                datasets: [
                    {
                        label: 'Position tags % of bad play',
                        data: posPctBad,
                        borderColor: '#7c3aed',
                        backgroundColor: makeGradient('chart-position-speed-granular', 'rgba(124, 58, 237, 0.15)'),
                        fill: true,
                        borderDash: [4, 3],
                    },
                    {
                        label: 'Speed tags % of bad play',
                        data: spdPctBad,
                        borderColor: '#0284c7',
                        backgroundColor: 'transparent',
                        fill: false,
                        borderDash: [2, 2],
                    },
                ],
            },
            options: granOpt,
        });
    }

    // ====== HERO CHARTS (pooled = dashboard; respects baseline cookie) ======
    const potSeries = data.pot_success_rates || [];
    const hasHeroPot = data.hero_pot_pct != null && (data.hero_pot_attempts ?? 0) > 0;
    let displayPotPct = null;
    if (hasHeroPot) {
        displayPotPct = Math.round(Number(data.hero_pot_pct) * 10) / 10;
    } else {
        const validPots = potSeries.filter((v) => v != null).map((v) => Math.round(v * 1000) / 10);
        if (validPots.length) displayPotPct = validPots[validPots.length - 1];
    }

    const ctxPot = document.getElementById('chart-pot-success');
    if (ctxPot && displayPotPct != null) {
        const ptTxt = document.getElementById('pot-success-center-text');
        if (ptTxt) ptTxt.textContent = displayPotPct + '%';

        const potSub = document.getElementById('hero-pot-sub');
        if (potSub) {
            potSub.textContent = hasHeroPot
                ? `${data.hero_pot_made} / ${data.hero_pot_attempts} attempts`
                : '';
        }

        if (hasHeroPot && data.hero_pot_trend) {
            setHeroTrendIcon('pot-success-trend-icon', data.hero_pot_trend);
        } else {
            const ptTrend = document.getElementById('pot-success-trend-icon');
            const validPots = potSeries.filter((v) => v != null).map((v) => Math.round(v * 1000) / 10);
            if (ptTrend) {
                if (validPots.length < 2) {
                    ptTrend.style.color = 'var(--muted)';
                    ptTrend.innerHTML = '';
                    ptTrend.setAttribute('title', 'Add another completed session to compare trend');
                } else {
                    const latestPotPct = validPots[validPots.length - 1];
                    const prevPotPct = validPots[validPots.length - 2];
                    ptTrend.removeAttribute('title');
                    if (latestPotPct >= prevPotPct) {
                        ptTrend.style.color = '#22c55e';
                        ptTrend.innerHTML = SVG_TREND_UP;
                    } else {
                        ptTrend.style.color = '#ef4444';
                        ptTrend.innerHTML = SVG_TREND_DOWN;
                    }
                }
            }
        }

        new Chart(ctxPot, {
            type: 'doughnut',
            data: {
                labels: ['Success', 'Missed'],
                datasets: [{
                    data: [displayPotPct, Math.max(0, 100 - displayPotPct)],
                    backgroundColor: ['#3b82f6', 'rgba(59, 130, 246, 0.1)'],
                    borderWidth: 0,
                    hoverOffset: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });
    }

    const hasHeroPos = data.hero_pos_pct != null && (data.hero_pos_cleared ?? 0) > 0;
    let displayPosPct = null;
    const posSeriesRaw = data.position_success_rates || [];
    if (hasHeroPos) {
        displayPosPct = Math.round(Number(data.hero_pos_pct) * 10) / 10;
    } else {
        const validMap = posSeriesRaw.map((v, i) => ({ v, i })).filter((item) => item.v != null);
        const recent = validMap.slice(-5);
        if (recent.length > 0) {
            displayPosPct = Math.round(recent[recent.length - 1].v * 1000) / 10;
        }
    }

    const ctxPosSucc = document.getElementById('chart-position-success');
    if (ctxPosSucc && displayPosPct != null) {
        const posTxt = document.getElementById('position-success-metric');
        if (posTxt) posTxt.textContent = displayPosPct + '%';

        const posSub = document.getElementById('hero-pos-sub');
        if (posSub) {
            posSub.textContent = hasHeroPos
                ? `${data.hero_pos_miss} misses / ${data.hero_pos_cleared} cleared`
                : '';
        }

        const barColors = ['#a78bfa', '#3b82f6', '#22c55e', '#c084fc', '#d8b4fe'];
        let posData;
        let posLabels;
        if (hasHeroPos) {
            posData = [displayPosPct];
            posLabels = ['Pooled'];
        } else {
            const validMap = posSeriesRaw.map((v, i) => ({ v, i })).filter((item) => item.v != null);
            const recent = validMap.slice(-5);
            posData = recent.map((item) => Math.round(item.v * 1000) / 10);
            posLabels = recent.map((item, idx) => 'S' + (validMap.length - recent.length + idx + 1));
        }

        new Chart(ctxPosSucc, {
            type: 'bar',
            data: {
                labels: posLabels,
                datasets: [{
                    data: posData,
                    backgroundColor: barColors.slice(0, posData.length),
                    borderRadius: 4,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { display: false }, y: { display: false, max: 100 } },
                plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(26, 27, 31, 0.9)' } }
            }
        });

        if (hasHeroPos && data.hero_position_trend) {
            setHeroTrendIcon('position-success-trend-icon', data.hero_position_trend);
        } else {
            const posTrendEl = document.getElementById('position-success-trend-icon');
            if (posTrendEl) {
                posTrendEl.innerHTML = '';
                posTrendEl.removeAttribute('title');
            }
        }
    }

    const ctxRackConv = document.getElementById('chart-rack-conversion');
    const rcSeriesRaw = data.rack_conversion_rates || [];
    const hasHeroRack = data.hero_rack_conv_pct != null && (data.hero_total_racks ?? 0) > 0;
    const hasRcSeries = rcSeriesRaw.some((v) => v != null);
    if (ctxRackConv && (hasRcSeries || hasHeroRack)) {
        const rcPctFull = hasRcSeries
            ? rcSeriesRaw.map((v) => (v == null ? null : Math.round(v * 1000) / 10))
            : [Math.round(Number(data.hero_rack_conv_pct) * 10) / 10];
        const rackChartLabels = hasRcSeries ? data.labels : ['Pooled'];
        const rcTxt = document.getElementById('rack-conversion-metric');
        if (rcTxt) {
            if (hasHeroRack) {
                rcTxt.textContent = Math.round(Number(data.hero_rack_conv_pct) * 10) / 10 + '%';
            } else {
                const validRc = rcPctFull.filter((v) => v != null);
                if (validRc.length > 0) rcTxt.textContent = validRc[validRc.length - 1] + '%';
            }
        }
        const rackSub = document.getElementById('hero-rack-sub');
        if (rackSub) {
            rackSub.textContent = hasHeroRack
                ? `${data.hero_racks_completed} / ${data.hero_total_racks} racks`
                : '';
        }

        if (hasHeroRack && data.hero_rack_trend) {
            setHeroTrendIcon('rack-conversion-trend-icon', data.hero_rack_trend);
        } else {
            const rackTrendEl = document.getElementById('rack-conversion-trend-icon');
            if (rackTrendEl) {
                rackTrendEl.innerHTML = '';
                rackTrendEl.removeAttribute('title');
            }
        }

        new Chart(ctxRackConv, {
            type: 'line',
            data: {
                labels: rackChartLabels,
                datasets: [{
                    label: 'Rack conversion %',
                    data: rcPctFull,
                    borderColor: '#3b82f6',
                    backgroundColor: makeGradient('chart-rack-conversion', 'rgba(59, 130, 246, 0.3)'),
                    borderWidth: 3, fill: true, tension: 0.4,
                    pointRadius: 0, pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { display: false }, y: { display: false, max: 100 } },
                plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(26, 27, 31, 0.9)' } },
                interaction: { mode: 'index', intersect: false }
            }
        });
    }

    // ====== FAILURE DIAGNOSTICS ======

    // 3b2. True miss rate
    const ctxTmr = document.getElementById('chart-true-miss-rate');
    if (ctxTmr && data.true_miss_rates) {
        setMetricFromLastSession(
            'metric-true-miss-rate',
            data.true_miss_rates,
            '',
            (v) => (v % 1 !== 0 ? Math.round(v * 1000) / 1000 : v)
        );
        const tmrOpt = cloneObj(commonLineOptions);
        new Chart(ctxTmr, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'True misses / rack',
                    data: data.true_miss_rates,
                    borderColor: darkAcc,
                    backgroundColor: makeGradient('chart-true-miss-rate', 'rgba(26, 27, 31, 0.15)'),
                    fill: true
                }]
            },
            options: tmrOpt
        });
    }

    // Misses vs Training Logs
    const ctxMisses = document.getElementById('chart-misses-rack');
    if (ctxMisses) {
        const missOpt = cloneObj(commonLineOptions);
        missOpt.plugins.legend = { display: true, position: 'top' };
        const truePer = data.true_misses_per_rack || data.misses_per_rack;
        const trainPer = data.training_logs_per_rack || [];
        new Chart(ctxMisses, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'True misses / rack',
                        data: truePer,
                        borderColor: frColor,
                        backgroundColor: makeGradient('chart-misses-rack', frColorLight),
                        fill: true
                    },
                    ...(trainPer.length ? [{
                        label: 'Training logs / rack',
                        data: trainPer,
                        borderColor: darkAcc,
                        backgroundColor: 'transparent',
                        fill: false,
                        borderDash: [6, 4]
                    }] : [])
                ]
            },
            options: missOpt
        });
    }

    // Rack Spread
    const ctxSpread = document.getElementById('chart-rack-spread');
    if (ctxSpread && data.labels && data.avg_rack_balls) {
        const spreadOpt = cloneObj(commonLineOptions);
        spreadOpt.plugins.legend = { display: true, position: 'top' };
        spreadOpt.scales.y.max = 9;
        new Chart(ctxSpread, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Worst rack',
                        data: data.worst_rack_balls,
                        borderColor: '#dc2626',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.25,
                        borderWidth: 2,
                        spanGaps: true
                    },
                    {
                        label: 'Average / rack',
                        data: data.avg_rack_balls,
                        borderColor: '#64748b',
                        backgroundColor: makeGradient('chart-rack-spread', 'rgba(100, 116, 139, 0.2)'),
                        fill: true,
                        tension: 0.25,
                        borderWidth: 2,
                        spanGaps: false
                    },
                    {
                        label: 'Best rack',
                        data: data.best_rack_balls,
                        borderColor: prColor,
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.25,
                        borderWidth: 2,
                        spanGaps: true
                    }
                ]
            },
            options: spreadOpt
        });
    }

    // No Shot
    const ctxNoShot = document.getElementById('chart-no-shot');
    if (ctxNoShot && data.no_shot_counts) {
        setMetricFromLastSession('metric-no-shot', data.no_shot_counts);
        new Chart(ctxNoShot, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'No Shot Events',
                    data: data.no_shot_counts,
                    borderColor: '#f59e0b',
                    backgroundColor: makeGradient('chart-no-shot', 'rgba(245, 158, 11, 0.2)'),
                    fill: true
                }]
            },
            options: commonLineOptions
        });
    }

    // Miss type %
    const ctxTypes = document.getElementById('chart-miss-types');
    if (ctxTypes && data.labels && data.labels.length) {
        const typeLabels = ['Position (true)', 'Alignment (true)', 'Delivery (true)', 'Speed (true)'];
        const typeKeys = ['miss_type_position', 'miss_type_alignment', 'miss_type_delivery', 'miss_type_speed'];
        const typeColors = ['#a78bfa', '#f472b6', '#fcd34d', '#38bdf8'];
        const sessionPalette = ['#a78bfa', '#f472b6', '#fcd34d', '#38bdf8', '#9ca3af', '#ff694b', '#7c3aed', '#14b8a6', '#f97316', '#64748b'];
        
        let missTypeDatasets;
        if (data.labels.length === 1) {
            missTypeDatasets = [{
                label: data.labels[0],
                data: typeKeys.map(k => data[k] && data[k][0] != null ? Number(data[k][0]) : 0),
                backgroundColor: typeColors,
                borderRadius: 8
            }];
        } else {
            missTypeDatasets = data.labels.map((lab, i) => ({
                label: lab,
                data: typeKeys.map(k => data[k] && data[k][i] != null ? Number(data[k][i]) : 0),
                backgroundColor: sessionPalette[i % sessionPalette.length],
                borderRadius: 8
            }));
        }

        const typeOpt = cloneObj(commonLineOptions);
        typeOpt.plugins.legend = { display: true, position: 'top' };
        typeOpt.scales.y.max = 100;
        typeOpt.scales.x.stacked = false;
        typeOpt.scales.x.grid = { display: false };
        new Chart(ctxTypes, {
            type: 'bar',
            data: { labels: typeLabels, datasets: missTypeDatasets },
            options: typeOpt
        });
    }

    // Miss Ball Histogram
    const ctxHist = document.getElementById('chart-miss-hist');
    if (ctxHist) {
        const histOpt = cloneObj(commonLineOptions);
        histOpt.scales.x.grid = { display: false };
        new Chart(ctxHist, {
            type: 'bar',
            data: {
                labels: data.hist_labels,
                datasets: [{
                    label: 'True miss count',
                    data: data.hist_data,
                    backgroundColor: brandColor,
                    borderRadius: 8
                }]
            },
            options: histOpt
        });
    }
});
