import fs from 'fs';
import path from 'path';
import { config } from './config.js';

/**
 * Generate HTML test report
 */
export async function generateReport(results, summary) {
  const reportDir = config.report.directory;
  
  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const html = generateHTMLReport(results, summary);
  const reportPath = path.join(reportDir, 'test-report.html');
  
  fs.writeFileSync(reportPath, html);
  
  // Also generate JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    summary,
    results
  };
  
  const jsonPath = path.join(reportDir, 'test-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  
  return reportPath;
}

function generateHTMLReport(results, summary) {
  const passRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartGoal Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    
    .header p {
      opacity: 0.9;
      font-size: 1.1rem;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 40px;
      background: #f7fafc;
    }
    
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .stat-label {
      color: #718096;
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
    }
    
    .passed { color: #48bb78; }
    .failed { color: #f56565; }
    .skipped { color: #ed8936; }
    .total { color: #4299e1; }
    
    .progress-bar {
      background: #e2e8f0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 15px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #48bb78, #38a169);
      transition: width 0.3s ease;
    }
    
    .results {
      padding: 40px;
    }
    
    .results h2 {
      font-size: 1.8rem;
      margin-bottom: 25px;
      color: #2d3748;
    }
    
    .test-item {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      transition: all 0.2s;
    }
    
    .test-item:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .test-name {
      font-weight: 600;
      font-size: 1.1rem;
      color: #2d3748;
    }
    
    .status-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-passed {
      background: #c6f6d5;
      color: #22543d;
    }
    
    .status-failed {
      background: #fed7d7;
      color: #742a2a;
    }
    
    .status-skipped {
      background: #feebc8;
      color: #7c2d12;
    }
    
    .test-error {
      background: #fff5f5;
      border-left: 4px solid #f56565;
      padding: 12px;
      margin-top: 10px;
      border-radius: 4px;
      color: #742a2a;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }
    
    .footer {
      background: #f7fafc;
      padding: 20px;
      text-align: center;
      color: #718096;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 SmartGoal Test Report</h1>
      <p>Automated Selenium Tests - ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
      <div class="stat-card">
        <div class="stat-value total">${summary.totalTests}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value passed">${summary.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value failed">${summary.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value skipped">${summary.skipped}</div>
        <div class="stat-label">Skipped</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value total">${(summary.duration / 1000).toFixed(1)}s</div>
        <div class="stat-label">Duration</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-value" style="color: ${passRate >= 80 ? '#48bb78' : passRate >= 50 ? '#ed8936' : '#f56565'}">${passRate}%</div>
        <div class="stat-label">Pass Rate</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>
      </div>
    </div>
    
    <div class="results">
      <h2>📋 Test Results</h2>
      
      ${results.map(result => `
        <div class="test-item">
          <div class="test-header">
            <div class="test-name">${result.name}</div>
            <span class="status-badge status-${result.status.toLowerCase()}">${result.status}</span>
          </div>
          ${result.error ? `
            <div class="test-error">
              <strong>Error:</strong> ${result.error}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    
    <div class="footer">
      <p>Generated by SmartGoal Selenium Test Suite</p>
      <p>Screenshots available in: ./screenshots/</p>
    </div>
  </div>
</body>
</html>
  `;
}

export default { generateReport };

