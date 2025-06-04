// Dashboard View - Analytics and statistics with performance optimizations
import { getAllApplicationsFromDB } from '../core/db.js';
import { performanceMonitor, memoize } from '../core/utils.js';
import { eventBus, EVENTS } from '../core/eventBus.js';
import { notifyError } from '../ui/ui.js';

// Memoized statistics calculation for performance
const calculateDashboardStats = memoize(async () => {
    performanceMonitor.start('calculate-stats');
    
    try {
        const applications = await getAllApplicationsFromDB();
        
        const stats = {
            total: applications.length,
            statusCounts: {},
            recentApplications: 0,
            thisWeekApplications: 0,
            thisMonthApplications: 0,
            averageResponseTime: 0,
            successRate: 0,
            topCompanies: {},
            weeklyTrend: [],
            monthlyTrend: []
        };
        
        // Calculate date thresholds
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        
        // Process applications
        applications.forEach(app => {
            const appDate = new Date(app.applicationDate);
            
            // Count by status
            stats.statusCounts[app.status] = (stats.statusCounts[app.status] || 0) + 1;
            
            // Recent applications
            if (appDate >= oneMonthAgo) {
                stats.recentApplications++;
            }
            
            if (appDate >= oneWeekAgo) {
                stats.thisWeekApplications++;
            }
            
            if (appDate >= oneMonthAgo) {
                stats.thisMonthApplications++;
            }
            
            // Company tracking
            stats.topCompanies[app.companyName] = (stats.topCompanies[app.companyName] || 0) + 1;
        });
        
        // Calculate success rate (offers / total applications)
        const offers = stats.statusCounts.offer || 0;
        stats.successRate = stats.total > 0 ? ((offers / stats.total) * 100).toFixed(1) : 0;
        
        // Calculate weekly trend
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
            
            const count = applications.filter(app => {
                const appDate = new Date(app.applicationDate);
                return appDate >= startOfDay && appDate < endOfDay;
            }).length;
            
            stats.weeklyTrend.push({
                date: startOfDay.toLocaleDateString('en-US', { weekday: 'short' }),
                count
            });
        }
        
        // Sort top companies
        stats.topCompanies = Object.entries(stats.topCompanies)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .reduce((obj, [company, count]) => {
                obj[company] = count;
                return obj;
            }, {});
        
        performanceMonitor.end('calculate-stats');
        
        return stats;
    } catch (error) {
        performanceMonitor.end('calculate-stats');
        throw error;
    }
});

// Optimized chart rendering using Canvas
class ChartRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupCanvas();
    }
    
    setupCanvas() {
        // Set up high DPI support
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
    }
    
    drawBarChart(data, options = {}) {
        performanceMonitor.start('draw-bar-chart');
        
        const {
            width = this.canvas.width,
            height = this.canvas.height,
            padding = 40,
            colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']
        } = options;
        
        this.ctx.clearRect(0, 0, width, height);
        
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const barWidth = chartWidth / data.length * 0.8;
        const maxValue = Math.max(...data.map(d => d.value));
        
        // Draw bars
        data.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = padding + (index * chartWidth / data.length) + (chartWidth / data.length - barWidth) / 2;
            const y = height - padding - barHeight;
            
            // Gradient fill
            const gradient = this.ctx.createLinearGradient(0, y, 0, y + barHeight);
            gradient.addColorStop(0, colors[index % colors.length]);
            gradient.addColorStop(1, this.adjustColor(colors[index % colors.length], -20));
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            // Label
            this.ctx.fillStyle = '#333';
            this.ctx.font = '12px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(item.label, x + barWidth / 2, height - padding + 15);
            
            // Value
            this.ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
        });
        
        performanceMonitor.end('draw-bar-chart');
    }
    
    drawLineChart(data, options = {}) {
        performanceMonitor.start('draw-line-chart');
        
        const {
            width = this.canvas.width,
            height = this.canvas.height,
            padding = 40,
            lineColor = '#667eea',
            pointColor = '#764ba2'
        } = options;
        
        this.ctx.clearRect(0, 0, width, height);
        
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const maxValue = Math.max(...data.map(d => d.count), 1);
        
        // Draw line
        this.ctx.strokeStyle = lineColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = height - padding - (point.count / maxValue) * chartHeight;
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
        
        // Draw points
        this.ctx.fillStyle = pointColor;
        data.forEach((point, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = height - padding - (point.count / maxValue) * chartHeight;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Label
            this.ctx.fillStyle = '#333';
            this.ctx.font = '10px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(point.date, x, height - padding + 15);
        });
        
        performanceMonitor.end('draw-line-chart');
    }
    
    drawPieChart(data, options = {}) {
        performanceMonitor.start('draw-pie-chart');
        
        const {
            width = this.canvas.width,
            height = this.canvas.height,
            colors = ['#667eea', '#f093fb', '#66bb6a', '#ffa726', '#ef5350', '#78909c']
        } = options;
        
        this.ctx.clearRect(0, 0, width, height);
        
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2;
        
        data.forEach((item, index) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            
            // Draw slice
            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Draw label
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
            const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(item.value.toString(), labelX, labelY);
            
            currentAngle += sliceAngle;
        });
        
        performanceMonitor.end('draw-pie-chart');
    }
    
    adjustColor(color, amount) {
        const usePound = color[0] === '#';
        const col = usePound ? color.slice(1) : color;
        const num = parseInt(col, 16);
        let r = (num >> 16) + amount;
        let g = (num >> 8 & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;
        
        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;
        
        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
    }
}

// Render dashboard with lazy loading
export async function renderDashboard() {
    performanceMonitor.start('render-dashboard');
    
    try {
        const stats = await calculateDashboardStats();
        
        // Get container
        const container = document.getElementById('statsContainer');
        if (!container) {
            console.error('Dashboard container not found');
            return;
        }
        
        // Create dashboard layout using DocumentFragment for performance
        const fragment = document.createDocumentFragment();
        
        // Summary cards
        const summarySection = createSummaryCards(stats);
        fragment.appendChild(summarySection);
        
        // Charts section
        const chartsSection = createChartsSection(stats);
        fragment.appendChild(chartsSection);
        
        // Clear and append
        container.innerHTML = '';
        container.appendChild(fragment);
        
        // Render charts with requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            renderCharts(stats);
        });
        
        performanceMonitor.end('render-dashboard');
        
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        notifyError('Failed to load dashboard data');
        performanceMonitor.end('render-dashboard');
    }
}

// Create summary cards
function createSummaryCards(stats) {
    const section = document.createElement('div');
    section.className = 'dashboard-summary';
    
    const cards = [
        { title: 'Total Applications', value: stats.total, icon: '📊' },
        { title: 'This Week', value: stats.thisWeekApplications, icon: '📅' },
        { title: 'This Month', value: stats.thisMonthApplications, icon: '🗓️' },
        { title: 'Success Rate', value: `${stats.successRate}%`, icon: '🎯' }
    ];
    
    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'summary-card';
        cardElement.innerHTML = `
            <div class="card-icon">${card.icon}</div>
            <div class="card-content">
                <h3 class="card-title">${card.title}</h3>
                <div class="card-value">${card.value}</div>
            </div>
        `;
        section.appendChild(cardElement);
    });
    
    return section;
}

// Create charts section
function createChartsSection(stats) {
    const section = document.createElement('div');
    section.className = 'dashboard-charts';
    
    // Status distribution chart
    const statusChart = document.createElement('div');
    statusChart.className = 'chart-container';
    statusChart.innerHTML = `
        <h3>Application Status</h3>
        <canvas id="statusChart" width="300" height="200"></canvas>
    `;
    
    // Weekly trend chart
    const trendChart = document.createElement('div');
    trendChart.className = 'chart-container';
    trendChart.innerHTML = `
        <h3>Weekly Applications</h3>
        <canvas id="trendChart" width="400" height="200"></canvas>
    `;
    
    // Top companies
    const companiesChart = document.createElement('div');
    companiesChart.className = 'chart-container';
    companiesChart.innerHTML = `
        <h3>Top Companies</h3>
        <canvas id="companiesChart" width="300" height="200"></canvas>
    `;
    
    section.appendChild(statusChart);
    section.appendChild(trendChart);
    section.appendChild(companiesChart);
    
    return section;
}

// Render charts with performance optimization
function renderCharts(stats) {
    // Use Intersection Observer for lazy chart rendering
    const chartObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const canvas = entry.target;
                const chartType = canvas.id;
                
                renderChart(canvas, chartType, stats);
                chartObserver.unobserve(canvas);
            }
        });
    }, { threshold: 0.1 });
    
    // Observe all charts
    document.querySelectorAll('canvas').forEach(canvas => {
        chartObserver.observe(canvas);
    });
}

// Render individual chart
function renderChart(canvas, chartType, stats) {
    const renderer = new ChartRenderer(canvas);
    
    switch (chartType) {
        case 'statusChart':
            const statusData = Object.entries(stats.statusCounts).map(([status, count]) => ({
                label: status,
                value: count
            }));
            renderer.drawPieChart(statusData);
            break;
            
        case 'trendChart':
            renderer.drawLineChart(stats.weeklyTrend);
            break;
            
        case 'companiesChart':
            const companiesData = Object.entries(stats.topCompanies).map(([company, count]) => ({
                label: company.length > 10 ? company.substring(0, 10) + '...' : company,
                value: count
            }));
            renderer.drawBarChart(companiesData);
            break;
    }
}

// Optimized dashboard update on data changes
const debouncedDashboardUpdate = (() => {
    let updateTimer;
    
    return () => {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
            // Clear memoization cache
            calculateDashboardStats.cache?.clear();
            renderDashboard();
        }, 500);
    };
})();

// Listen for data changes
eventBus.on(EVENTS.APPLICATION_ADDED, debouncedDashboardUpdate);
eventBus.on(EVENTS.APPLICATION_UPDATED, debouncedDashboardUpdate);
eventBus.on(EVENTS.APPLICATION_DELETED, debouncedDashboardUpdate);

// Export for use in other modules
export { calculateDashboardStats };