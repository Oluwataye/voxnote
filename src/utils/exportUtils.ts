import { AnalyticsData } from "@/hooks/consultation/useConsultationAnalytics";

export const exportToCSV = (analytics: AnalyticsData, filename: string = "analytics-report.csv") => {
  if (!analytics) return;

  // Create CSV content
  let csvContent = "Analytics Report\n\n";
  
  // Summary statistics
  csvContent += "Summary Statistics\n";
  csvContent += "Metric,Value\n";
  csvContent += `Total Consultations,${analytics.totalConsultations}\n`;
  csvContent += `Completed Consultations,${analytics.completedConsultations}\n`;
  csvContent += `In Progress Consultations,${analytics.inProgressConsultations}\n`;
  csvContent += `Consultations This Week,${analytics.consultationsThisWeek}\n`;
  csvContent += `Consultations This Month,${analytics.consultationsThisMonth}\n`;
  csvContent += `Average Per Week,${analytics.averagePerWeek.toFixed(1)}\n\n`;

  // Daily data
  csvContent += "Daily Consultations\n";
  csvContent += "Date,Count\n";
  analytics.dailyData.forEach(item => {
    csvContent += `${item.date},${item.count}\n`;
  });
  csvContent += "\n";

  // Weekly data
  csvContent += "Weekly Consultations\n";
  csvContent += "Week,Count\n";
  analytics.weeklyData.forEach(item => {
    csvContent += `${item.week},${item.count}\n`;
  });
  csvContent += "\n";

  // Monthly data
  csvContent += "Monthly Consultations\n";
  csvContent += "Month,Count\n";
  analytics.monthlyData.forEach(item => {
    csvContent += `${item.month},${item.count}\n`;
  });
  csvContent += "\n";

  // Status distribution
  csvContent += "Status Distribution\n";
  csvContent += "Status,Count,Percentage\n";
  analytics.statusDistribution.forEach(item => {
    csvContent += `${item.status},${item.count},${item.percentage.toFixed(1)}%\n`;
  });

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = async (analytics: AnalyticsData, filename: string = "analytics-report.pdf") => {
  if (!analytics) return;

  // Create HTML content for PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #333;
        }
        h1 {
          color: #0ea5e9;
          border-bottom: 2px solid #0ea5e9;
          padding-bottom: 10px;
        }
        h2 {
          color: #0284c7;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #0ea5e9;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f9fafb;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        .summary-card {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 8px;
        }
        .summary-card h3 {
          margin: 0 0 10px 0;
          color: #64748b;
          font-size: 14px;
        }
        .summary-card .value {
          font-size: 28px;
          font-weight: bold;
          color: #0ea5e9;
        }
      </style>
    </head>
    <body>
      <h1>Analytics Report</h1>
      <p>Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
      
      <h2>Summary Statistics</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <h3>Total Consultations</h3>
          <div class="value">${analytics.totalConsultations}</div>
        </div>
        <div class="summary-card">
          <h3>Completed Consultations</h3>
          <div class="value">${analytics.completedConsultations}</div>
        </div>
        <div class="summary-card">
          <h3>In Progress</h3>
          <div class="value">${analytics.inProgressConsultations}</div>
        </div>
        <div class="summary-card">
          <h3>Average Per Week</h3>
          <div class="value">${analytics.averagePerWeek.toFixed(1)}</div>
        </div>
      </div>

      <h2>Status Distribution</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${analytics.statusDistribution.map(item => `
            <tr>
              <td>${item.status}</td>
              <td>${item.count}</td>
              <td>${item.percentage.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Monthly Consultations</h2>
      <table>
        <thead>
          <tr>
            <th>Month</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          ${analytics.monthlyData.map(item => `
            <tr>
              <td>${item.month}</td>
              <td>${item.count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Create a new window to print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }
};
