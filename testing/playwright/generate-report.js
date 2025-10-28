import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reportDir = path.join(__dirname, 'playwright-report');
const resultsFile = path.join(__dirname, 'test-results.json');

/**
 * Generate HTML Screenshot Viewer
 */
function generateHTMLViewer() {
  console.log('\n📸 Generating HTML Screenshot Viewer...\n');
  
  // Read test results
  let testResults = [];
  if (fs.existsSync(resultsFile)) {
    const data = fs.readFileSync(resultsFile, 'utf-8');
    const results = JSON.parse(data);
    testResults = results.suites || [];
  }

  // Find all screenshots
  const screenshots = [];
  if (fs.existsSync(reportDir)) {
    const files = fs.readdirSync(reportDir);
    files.forEach(file => {
      if (file.endsWith('.png')) {
        screenshots.push(file);
      }
    });
  }

  // Group screenshots by test category
  const categorizedScreenshots = {
    auth: screenshots.filter(s => s.includes('login') || s.includes('registration')),
    goals: screenshots.filter(s => s.includes('goal')),
    wishlist: screenshots.filter(s => s.includes('wishlist')),
    marketplace: screenshots.filter(s => s.includes('marketplace') || s.includes('product')),
    cart: screenshots.filter(s => s.includes('cart') || s.includes('checkout')),
    other: screenshots.filter(s => 
      !s.includes('login') && !s.includes('registration') && 
      !s.includes('goal') && !s.includes('wishlist') && 
      !s.includes('marketplace') && !s.includes('product') &&
      !s.includes('cart') && !s.includes('checkout')
    )
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartGoal - Playwright Test Screenshots</title>
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
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px 40px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 0.9rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    nav {
      display: flex;
      gap: 10px;
      padding: 20px 40px;
      background: white;
      border-bottom: 2px solid #f0f0f0;
      flex-wrap: wrap;
    }
    
    .nav-btn {
      padding: 12px 24px;
      background: #f0f0f0;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      transition: all 0.3s ease;
      color: #333;
    }
    
    .nav-btn:hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .nav-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .content {
      padding: 40px;
    }
    
    .category-section {
      display: none;
    }
    
    .category-section.active {
      display: block;
    }
    
    .category-title {
      font-size: 1.8rem;
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    
    .screenshots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 30px;
      margin-bottom: 40px;
    }
    
    .screenshot-card {
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
      cursor: pointer;
    }
    
    .screenshot-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
      border-color: #667eea;
    }
    
    .screenshot-card img {
      width: 100%;
      height: 300px;
      object-fit: cover;
      display: block;
    }
    
    .screenshot-info {
      padding: 15px;
      background: #f8f9fa;
    }
    
    .screenshot-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 5px;
      font-size: 1rem;
    }
    
    .screenshot-meta {
      font-size: 0.85rem;
      color: #666;
    }
    
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      justify-content: center;
      align-items: center;
    }
    
    .modal.active {
      display: flex;
    }
    
    .modal-content {
      max-width: 90%;
      max-height: 90%;
      position: relative;
    }
    
    .modal-content img {
      max-width: 100%;
      max-height: 90vh;
      display: block;
      border-radius: 8px;
    }
    
    .close-modal {
      position: absolute;
      top: -40px;
      right: 0;
      color: white;
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.2);
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }
    
    .close-modal:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: rotate(90deg);
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }
    
    .empty-state svg {
      width: 100px;
      height: 100px;
      margin-bottom: 20px;
      opacity: 0.5;
    }
    
    footer {
      background: #f8f9fa;
      padding: 20px 40px;
      text-align: center;
      color: #666;
      border-top: 1px solid #e0e0e0;
    }
    
    @media (max-width: 768px) {
      .screenshots-grid {
        grid-template-columns: 1fr;
      }
      
      h1 {
        font-size: 1.8rem;
      }
      
      .stats {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎯 SmartGoal Test Screenshots</h1>
      <p class="subtitle">Playwright Automated Test Results</p>
    </header>
    
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${screenshots.length}</div>
        <div class="stat-label">Screenshots</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Object.keys(categorizedScreenshots).filter(k => categorizedScreenshots[k].length > 0).length}</div>
        <div class="stat-label">Categories</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${new Date().toLocaleDateString()}</div>
        <div class="stat-label">Test Date</div>
      </div>
    </div>
    
    <nav>
      <button class="nav-btn active" onclick="showCategory('all')">All Screenshots</button>
      ${categorizedScreenshots.auth.length > 0 ? '<button class="nav-btn" onclick="showCategory(\'auth\')">Authentication</button>' : ''}
      ${categorizedScreenshots.goals.length > 0 ? '<button class="nav-btn" onclick="showCategory(\'goals\')">Goals</button>' : ''}
      ${categorizedScreenshots.wishlist.length > 0 ? '<button class="nav-btn" onclick="showCategory(\'wishlist\')">Wishlist</button>' : ''}
      ${categorizedScreenshots.marketplace.length > 0 ? '<button class="nav-btn" onclick="showCategory(\'marketplace\')">Marketplace</button>' : ''}
      ${categorizedScreenshots.cart.length > 0 ? '<button class="nav-btn" onclick="showCategory(\'cart\')">Cart</button>' : ''}
    </nav>
    
    <div class="content">
      <!-- All Screenshots -->
      <div id="all" class="category-section active">
        <h2 class="category-title">All Screenshots</h2>
        <div class="screenshots-grid">
          ${screenshots.map(screenshot => `
            <div class="screenshot-card" onclick="openModal('${screenshot}')">
              <img src="${screenshot}" alt="${screenshot}" loading="lazy">
              <div class="screenshot-info">
                <div class="screenshot-name">${formatScreenshotName(screenshot)}</div>
                <div class="screenshot-meta">${screenshot}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Authentication -->
      ${categorizedScreenshots.auth.length > 0 ? `
      <div id="auth" class="category-section">
        <h2 class="category-title">Authentication Tests</h2>
        <div class="screenshots-grid">
          ${categorizedScreenshots.auth.map(screenshot => `
            <div class="screenshot-card" onclick="openModal('${screenshot}')">
              <img src="${screenshot}" alt="${screenshot}" loading="lazy">
              <div class="screenshot-info">
                <div class="screenshot-name">${formatScreenshotName(screenshot)}</div>
                <div class="screenshot-meta">${screenshot}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Goals -->
      ${categorizedScreenshots.goals.length > 0 ? `
      <div id="goals" class="category-section">
        <h2 class="category-title">Goals Tests</h2>
        <div class="screenshots-grid">
          ${categorizedScreenshots.goals.map(screenshot => `
            <div class="screenshot-card" onclick="openModal('${screenshot}')">
              <img src="${screenshot}" alt="${screenshot}" loading="lazy">
              <div class="screenshot-info">
                <div class="screenshot-name">${formatScreenshotName(screenshot)}</div>
                <div class="screenshot-meta">${screenshot}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Wishlist -->
      ${categorizedScreenshots.wishlist.length > 0 ? `
      <div id="wishlist" class="category-section">
        <h2 class="category-title">Wishlist Tests</h2>
        <div class="screenshots-grid">
          ${categorizedScreenshots.wishlist.map(screenshot => `
            <div class="screenshot-card" onclick="openModal('${screenshot}')">
              <img src="${screenshot}" alt="${screenshot}" loading="lazy">
              <div class="screenshot-info">
                <div class="screenshot-name">${formatScreenshotName(screenshot)}</div>
                <div class="screenshot-meta">${screenshot}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Marketplace -->
      ${categorizedScreenshots.marketplace.length > 0 ? `
      <div id="marketplace" class="category-section">
        <h2 class="category-title">Marketplace Tests</h2>
        <div class="screenshots-grid">
          ${categorizedScreenshots.marketplace.map(screenshot => `
            <div class="screenshot-card" onclick="openModal('${screenshot}')">
              <img src="${screenshot}" alt="${screenshot}" loading="lazy">
              <div class="screenshot-info">
                <div class="screenshot-name">${formatScreenshotName(screenshot)}</div>
                <div class="screenshot-meta">${screenshot}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Cart -->
      ${categorizedScreenshots.cart.length > 0 ? `
      <div id="cart" class="category-section">
        <h2 class="category-title">Shopping Cart Tests</h2>
        <div class="screenshots-grid">
          ${categorizedScreenshots.cart.map(screenshot => `
            <div class="screenshot-card" onclick="openModal('${screenshot}')">
              <img src="${screenshot}" alt="${screenshot}" loading="lazy">
              <div class="screenshot-info">
                <div class="screenshot-name">${formatScreenshotName(screenshot)}</div>
                <div class="screenshot-meta">${screenshot}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
    </div>
    
    <footer>
      <p>Generated on ${new Date().toLocaleString()} | SmartGoal Playwright Tests</p>
    </footer>
  </div>
  
  <!-- Modal for full-size image -->
  <div id="imageModal" class="modal" onclick="closeModal()">
    <div class="modal-content" onclick="event.stopPropagation()">
      <span class="close-modal" onclick="closeModal()">&times;</span>
      <img id="modalImage" src="" alt="Full size screenshot">
    </div>
  </div>
  
  <script>
    function showCategory(category) {
      // Hide all sections
      document.querySelectorAll('.category-section').forEach(section => {
        section.classList.remove('active');
      });
      
      // Remove active from all buttons
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Show selected section
      document.getElementById(category).classList.add('active');
      
      // Mark button as active
      event.target.classList.add('active');
    }
    
    function openModal(imageSrc) {
      document.getElementById('imageModal').classList.add('active');
      document.getElementById('modalImage').src = imageSrc;
    }
    
    function closeModal() {
      document.getElementById('imageModal').classList.remove('active');
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        closeModal();
      }
    });
    
    function formatScreenshotName(filename) {
      return filename
        .replace('.png', '')
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  </script>
</body>
</html>`;

  const htmlPath = path.join(reportDir, 'screenshots.html');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(htmlPath, html);
  
  console.log('✅ HTML Screenshot Viewer created:', htmlPath);
}

/**
 * Generate Markdown Report
 */
function generateMarkdownReport() {
  console.log('\n📝 Generating Markdown Report...\n');
  
  let testResults = null;
  if (fs.existsSync(resultsFile)) {
    const data = fs.readFileSync(resultsFile, 'utf-8');
    testResults = JSON.parse(data);
  }

  const screenshots = [];
  if (fs.existsSync(reportDir)) {
    const files = fs.readdirSync(reportDir);
    files.forEach(file => {
      if (file.endsWith('.png')) {
        screenshots.push(file);
      }
    });
  }

  const testDate = new Date().toLocaleString();
  
  let markdown = `# 🎯 SmartGoal - Playwright Test Report

**Generated:** ${testDate}

---

## 📊 Test Summary

`;

  if (testResults && testResults.suites) {
    const allTests = [];
    testResults.suites.forEach(suite => {
      if (suite.specs) {
        suite.specs.forEach(spec => {
          allTests.push({
            title: spec.title,
            suite: suite.title,
            status: spec.ok ? 'passed' : 'failed',
            tests: spec.tests || []
          });
        });
      }
    });

    const passed = allTests.filter(t => t.status === 'passed').length;
    const failed = allTests.filter(t => t.status === 'failed').length;
    const total = allTests.length;

    markdown += `| Metric | Count |
|--------|-------|
| Total Tests | ${total} |
| ✅ Passed | ${passed} |
| ❌ Failed | ${failed} |
| 📸 Screenshots | ${screenshots.length} |
| 🎭 Test Suites | ${testResults.suites.length} |

**Success Rate:** ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%

---

## 📋 Test Results by Suite

`;

    testResults.suites.forEach(suite => {
      markdown += `### ${suite.title}\n\n`;
      
      if (suite.specs && suite.specs.length > 0) {
        markdown += `| Test | Status | Duration |\n`;
        markdown += `|------|--------|----------|\n`;
        
        suite.specs.forEach(spec => {
          const status = spec.ok ? '✅ Passed' : '❌ Failed';
          const duration = spec.tests && spec.tests[0] ? 
            `${(spec.tests[0].results[0].duration / 1000).toFixed(2)}s` : 'N/A';
          markdown += `| ${spec.title} | ${status} | ${duration} |\n`;
        });
      }
      
      markdown += '\n';
    });
  } else {
    markdown += `**No test results found.** Please run tests first.\n\n`;
  }

  markdown += `---

## 📸 Screenshots

Total Screenshots: **${screenshots.length}**

### Screenshot Gallery

`;

  // Group screenshots by category
  const categories = {
    'Authentication': screenshots.filter(s => s.includes('login') || s.includes('registration')),
    'Goals': screenshots.filter(s => s.includes('goal')),
    'Wishlist': screenshots.filter(s => s.includes('wishlist')),
    'Marketplace': screenshots.filter(s => s.includes('marketplace') || s.includes('product')),
    'Cart': screenshots.filter(s => s.includes('cart') || s.includes('checkout')),
  };

  Object.entries(categories).forEach(([category, shots]) => {
    if (shots.length > 0) {
      markdown += `#### ${category} Tests\n\n`;
      shots.forEach(screenshot => {
        const name = screenshot.replace('.png', '').replace(/-/g, ' ');
        markdown += `- **${name}**\n  ![${name}](playwright-report/${screenshot})\n\n`;
      });
    }
  });

  markdown += `---

## 🔗 Quick Links

- [View HTML Screenshot Gallery](playwright-report/screenshots.html)
- [Playwright HTML Report](playwright-report/index.html)
- [Test Results JSON](test-results.json)

---

## 📝 Test Configuration

- **Base URL:** http://localhost:5173
- **Browser:** Chromium
- **Viewport:** 1920x1080
- **Timeout:** 30000ms
- **Parallel Workers:** 1

---

## 🚀 Running Tests

### Run All Tests
\`\`\`bash
npm test
\`\`\`

### Run Specific Test Suite
\`\`\`bash
npm run test:auth        # Authentication tests
npm run test:goals       # Goals tests
npm run test:wishlist    # Wishlist tests
npm run test:marketplace # Marketplace tests
npm run test:cart        # Cart tests
\`\`\`

### View Reports
\`\`\`bash
npm run report           # Open Playwright HTML report
\`\`\`

---

## 📌 Notes

- Tests are designed to be resilient and handle various application states
- Screenshots are automatically captured at key points
- Some tests may gracefully skip if certain conditions aren't met (e.g., insufficient savings)
- For goal/wishlist creation tests, ensure test users have sufficient savings balance (≥₹100)

---

**Report Generated by:** Playwright Test Framework  
**SmartGoal Version:** 1.0.0
`;

  const mdPath = path.join(__dirname, 'TEST_REPORT.md');
  fs.writeFileSync(mdPath, markdown);
  
  console.log('✅ Markdown Report created:', mdPath);
}

/**
 * Main execution
 */
function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 SmartGoal - Test Report Generator');
  console.log('='.repeat(60));

  try {
    generateHTMLViewer();
    generateMarkdownReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Report generation complete!');
    console.log('='.repeat(60));
    console.log('\n📂 Generated Files:');
    console.log('  - playwright-report/screenshots.html (HTML Screenshot Viewer)');
    console.log('  - TEST_REPORT.md (Markdown Report)');
    console.log('\n💡 Open screenshots.html in your browser to view all test screenshots');
    console.log('');
  } catch (error) {
    console.error('\n❌ Error generating reports:', error.message);
    process.exit(1);
  }
}

main();


