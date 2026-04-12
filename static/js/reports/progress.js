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
        // If there's no data, we could show a message, but the charts will just render empty.
        console.log("No progress data available.");
    }

    // Chart Design System integration
    // We match the soft, premium palette of the application layout
    Chart.defaults.font.family = '"Outfit", "Inter", system-ui, sans-serif';
    Chart.defaults.color = '#8e9199'; // var(--muted)
    Chart.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.04)'; // var(--border)
    
    const brandColor = '#ff694b'; // var(--accent-brand)
    const brandColorLight = 'rgba(255, 105, 75, 0.2)';
    const prColor = '#9bc263'; // var(--pr-dim)
    const prColorLight = 'rgba(155, 194, 99, 0.2)';
    const frColor = '#ff8b9b'; // var(--fr-dim)
    const frColorLight = 'rgba(255, 139, 155, 0.2)';
    const darkAcc = '#1a1b1f';

    // Shared options for line charts
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
                border: { display: false }
            },
            x: {
                grid: { display: false },
                border: { display: false }
            }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        elements: {
            line: { tension: 0.3, borderWidth: 3 }, // smooth curves
            point: { radius: 4, hoverRadius: 6, borderWidth: 2, backgroundColor: '#fff' }
        }
    };

    const cloneObj = (obj) => JSON.parse(JSON.stringify(obj));

    // 1. Avg Balls Cleared (Primary KPI)
    const ctxAvg = document.getElementById('chart-avg-balls');
    if (ctxAvg) {
        new Chart(ctxAvg, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Avg Balls Cleared',
                    data: data.avg_balls_cleared,
                    borderColor: prColor,
                    backgroundColor: prColorLight,
                    fill: true
                }]
            },
            options: commonLineOptions
        });
    }

    // 2. True misses vs training logs per rack (new run-breaking model)
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
                        backgroundColor: frColorLight,
                        fill: true
                    },
                    ...(trainPer.length
                        ? [{
                            label: 'Training logs / rack',
                            data: trainPer,
                            borderColor: darkAcc,
                            backgroundColor: 'rgba(26, 27, 31, 0.06)',
                            fill: false,
                            borderDash: [6, 4]
                        }]
                        : [])
                ]
            },
            options: missOpt
        });
    }

    // 3. Best Run / Max Balls
    const ctxRun = document.getElementById('chart-best-run');
    if (ctxRun) {
        new Chart(ctxRun, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Best Run',
                    data: data.best_runs,
                    borderColor: brandColor,
                    backgroundColor: brandColorLight,
                    fill: true
                }]
            },
            options: commonLineOptions
        });
    }

    // 3b0. Pot success (0–1 → %)
    const ctxPot = document.getElementById('chart-pot-success');
    const potSeries = data.pot_success_rates;
    if (ctxPot && potSeries && potSeries.length && potSeries.some((v) => v != null)) {
        const potPct = potSeries.map((v) => (v == null ? null : Math.round(v * 1000) / 10));
        const potOpt = cloneObj(commonLineOptions);
        potOpt.scales.y.max = 100;
        new Chart(ctxPot, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Pot success %',
                    data: potPct,
                    borderColor: prColor,
                    backgroundColor: prColorLight,
                    fill: true
                }]
            },
            options: potOpt
        });
    }

    // 3b0b. Position success (0–1 → %)
    const ctxPosSucc = document.getElementById('chart-position-success');
    const posSeries = data.position_success_rates;
    if (ctxPosSucc && posSeries && posSeries.length && posSeries.some((v) => v != null)) {
        const posPct = posSeries.map((v) => (v == null ? null : Math.round(v * 1000) / 10));
        const posOpt = cloneObj(commonLineOptions);
        posOpt.scales.y.max = 100;
        new Chart(ctxPosSucc, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Position outcome %',
                    data: posPct,
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.12)',
                    fill: true
                }]
            },
            options: posOpt
        });
    }

    const ctxPosSpdGran = document.getElementById('chart-position-speed-granular');
    const labelsGran = data.labels || [];
    let posGran = Array.isArray(data.position_granular_miss_totals)
        ? data.position_granular_miss_totals
        : [];
    let spdGran = Array.isArray(data.speed_granular_miss_totals)
        ? data.speed_granular_miss_totals
        : [];
    while (posGran.length < labelsGran.length) posGran.push(0);
    while (spdGran.length < labelsGran.length) spdGran.push(0);
    posGran = posGran.slice(0, labelsGran.length);
    spdGran = spdGran.slice(0, labelsGran.length);
    if (ctxPosSpdGran && labelsGran.length > 0 && posGran.length === spdGran.length) {
        const granOpt = cloneObj(commonLineOptions);
        granOpt.plugins.legend = { display: true, position: 'top' };
        const peak = Math.max(1, ...posGran, ...spdGran);
        granOpt.scales.y.max = peak;
        new Chart(ctxPosSpdGran, {
            type: 'line',
            data: {
                labels: labelsGran,
                datasets: [
                    {
                        label: 'Position-tagged misses',
                        data: posGran,
                        borderColor: '#7c3aed',
                        backgroundColor: 'rgba(124, 58, 237, 0.06)',
                        fill: false,
                        borderDash: [4, 3],
                    },
                    {
                        label: 'Speed-tagged misses',
                        data: spdGran,
                        borderColor: '#0284c7',
                        backgroundColor: 'rgba(2, 132, 199, 0.06)',
                        fill: false,
                        borderDash: [2, 2],
                    },
                ],
            },
            options: granOpt,
        });
    }

    // 3b. Flow efficiency (0–1 stored → display %); key is flow_efficiency with legacy fallback
    const ctxConv = document.getElementById('chart-conversion');
    const flowSeries = data.flow_efficiency || data.conversion_efficiency;
    if (ctxConv && flowSeries && flowSeries.some((v) => v != null)) {
        const convPct = flowSeries.map((v) => (v == null ? null : Math.round(v * 1000) / 10));
        const convOpt = cloneObj(commonLineOptions);
        convOpt.scales.y.max = 100;
        new Chart(ctxConv, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Flow efficiency %',
                    data: convPct,
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.15)',
                    fill: true
                }]
            },
            options: convOpt
        });
    }

    // 3b2. True miss rate (per ended rack)
    const ctxTmr = document.getElementById('chart-true-miss-rate');
    if (ctxTmr && data.true_miss_rates && data.true_miss_rates.some((v) => v != null)) {
        const tmrOpt = cloneObj(commonLineOptions);
        new Chart(ctxTmr, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'True misses / rack',
                    data: data.true_miss_rates,
                    borderColor: darkAcc,
                    backgroundColor: 'rgba(26, 27, 31, 0.08)',
                    fill: true
                }]
            },
            options: tmrOpt
        });
    }

    // 3b2b. Rack conversion rate (0–1 → %)
    const ctxRackConv = document.getElementById('chart-rack-conversion');
    const rcSeries = data.rack_conversion_rates;
    if (ctxRackConv && rcSeries && rcSeries.length && rcSeries.some((v) => v != null)) {
        const rcPct = rcSeries.map((v) => (v == null ? null : Math.round(v * 1000) / 10));
        const rcOpt = cloneObj(commonLineOptions);
        rcOpt.scales.y.max = 100;
        new Chart(ctxRackConv, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Rack conversion %',
                    data: rcPct,
                    borderColor: prColor,
                    backgroundColor: prColorLight,
                    fill: true
                }]
            },
            options: rcOpt
        });
    }

    // 3b3. Worst / avg / best balls cleared per rack
    const ctxSpread = document.getElementById('chart-rack-spread');
    if (
        ctxSpread &&
        data.labels &&
        data.labels.length &&
        data.avg_rack_balls &&
        data.avg_rack_balls.length
    ) {
        const spreadOpt = cloneObj(commonLineOptions);
        spreadOpt.plugins.legend = { display: true, position: 'top' };
        new Chart(ctxSpread, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Worst rack',
                        data: data.worst_rack_balls,
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.06)',
                        fill: false,
                        tension: 0.25,
                        borderWidth: 2,
                        spanGaps: true
                    },
                    {
                        label: 'Average / rack',
                        data: data.avg_rack_balls,
                        borderColor: '#64748b',
                        backgroundColor: 'rgba(100, 116, 139, 0.1)',
                        fill: false,
                        tension: 0.25,
                        borderWidth: 2
                    },
                    {
                        label: 'Best rack',
                        data: data.best_rack_balls,
                        borderColor: prColor,
                        backgroundColor: prColorLight,
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

    // 3c. Recovery % and failed recovery % (of training misses per session)
    const ctxRec = document.getElementById('chart-recovery');
    if (
        ctxRec &&
        data.recovery_pct &&
        data.recovery_pct.some((v) => v != null)
    ) {
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
                        backgroundColor: 'rgba(124, 58, 237, 0.12)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 3
                    },
                    {
                        label: 'Failed recovery %',
                        data: data.failed_recovery_pct || [],
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.08)',
                        fill: false,
                        tension: 0.3,
                        borderWidth: 2,
                        borderDash: [5, 4]
                    }
                ]
            },
            options: recOpt
        });
    }

    // 4. "No Shot Due to Position"
    const ctxNoShot = document.getElementById('chart-no-shot');
    if (ctxNoShot) {
        new Chart(ctxNoShot, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'No Shot Events',
                    data: data.no_shot_counts,
                    borderColor: darkAcc,
                    backgroundColor: 'rgba(26, 27, 31, 0.1)',
                    fill: true
                }]
            },
            options: commonLineOptions
        });
    }

    // 5. Miss type % on run-breaking misses — X = miss categories (not dates) so every type gets a bar.
    const ctxTypes = document.getElementById('chart-miss-types');
    if (ctxTypes && data.labels && data.labels.length) {
        const typeLabels = [
            'Position (true)',
            'Alignment (true)',
            'Delivery (true)',
            'Speed (true)'
        ];
        const typeKeys = [
            'miss_type_position',
            'miss_type_alignment',
            'miss_type_delivery',
            'miss_type_speed'
        ];
        const typeColors = ['#a78bfa', '#f472b6', '#fcd34d', '#38bdf8'];
        const sessionPalette = [
            '#a78bfa',
            '#f472b6',
            '#fcd34d',
            '#38bdf8',
            '#9ca3af',
            '#ff694b',
            '#7c3aed',
            '#14b8a6',
            '#f97316',
            '#64748b'
        ];
        const n = data.labels.length;
        let missTypeDatasets;
        if (n === 1) {
            missTypeDatasets = [
                {
                    label: data.labels[0],
                    data: typeKeys.map((k) =>
                        data[k] && data[k][0] != null ? Number(data[k][0]) : 0
                    ),
                    backgroundColor: typeColors,
                    borderRadius: 4
                }
            ];
        } else {
            missTypeDatasets = data.labels.map((lab, i) => ({
                label: lab,
                data: typeKeys.map((k) =>
                    data[k] && data[k][i] != null ? Number(data[k][i]) : 0
                ),
                backgroundColor: sessionPalette[i % sessionPalette.length],
                borderRadius: 4
            }));
        }

        const typeOpt = cloneObj(commonLineOptions);
        typeOpt.plugins.legend = { display: true, position: 'top' };
        typeOpt.scales.x = {
            ...typeOpt.scales.x,
            stacked: false
        };
        typeOpt.scales.y = {
            ...typeOpt.scales.y,
            stacked: false,
            max: 100,
            beginAtZero: true
        };
        typeOpt.elements.bar = { borderRadius: 4 };
        typeOpt.interaction = { mode: 'index', axis: 'x', intersect: false };

        new Chart(ctxTypes, {
            type: 'bar',
            data: {
                labels: typeLabels,
                datasets: missTypeDatasets
            },
            options: typeOpt
        });
    }

    // 6. Miss Ball Histogram
    const ctxHist = document.getElementById('chart-miss-hist');
    if (ctxHist) {
        const histOpt = cloneObj(commonLineOptions);
        histOpt.elements.bar = { borderRadius: 4 };
        
        new Chart(ctxHist, {
            type: 'bar',
            data: {
                labels: data.hist_labels,
                datasets: [{
                    label: 'True miss count',
                    data: data.hist_data,
                    backgroundColor: brandColor
                }]
            },
            options: histOpt
        });
    }

});
