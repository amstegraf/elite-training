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

    // 2. Misses per Rack
    const ctxMisses = document.getElementById('chart-misses-rack');
    if (ctxMisses) {
        new Chart(ctxMisses, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Misses / Rack',
                    data: data.misses_per_rack,
                    borderColor: frColor,
                    backgroundColor: frColorLight,
                    fill: true
                }]
            },
            options: commonLineOptions
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

    // 5. Miss Type Distribution (Stacked Bar)
    const ctxTypes = document.getElementById('chart-miss-types');
    if (ctxTypes) {
        const typeOpt = cloneObj(commonLineOptions);
        typeOpt.plugins.legend = { display: true, position: 'top' };
        typeOpt.scales.x.stacked = true;
        typeOpt.scales.y.stacked = true;
        typeOpt.scales.y.max = 100;
        
        new Chart(ctxTypes, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    { label: 'Position', data: data.miss_type_position, backgroundColor: '#a78bfa' },
                    { label: 'Alignment', data: data.miss_type_alignment, backgroundColor: '#f472b6' },
                    { label: 'Delivery', data: data.miss_type_delivery, backgroundColor: '#fcd34d' },
                    { label: 'Speed', data: data.miss_type_speed, backgroundColor: '#38bdf8' },
                    { label: 'Combined', data: data.miss_type_combined, backgroundColor: '#9ca3af' }
                ]
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
                    label: 'Miss Count',
                    data: data.hist_data,
                    backgroundColor: brandColor
                }]
            },
            options: histOpt
        });
    }

});
