import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import { config } from '../config.js';

/**
 * Create and configure WebDriver instance
 */
export async function createDriver() {
  const options = new chrome.Options();
  
  if (config.browser.headless) {
    options.addArguments('--headless');
  }
  
  options.addArguments('--disable-gpu');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments(`--window-size=${config.browser.windowSize.width},${config.browser.windowSize.height}`);
  
  const driver = await new Builder()
    .forBrowser(config.browser.name)
    .setChromeOptions(options)
    .build();
  
  // Set timeouts
  await driver.manage().setTimeouts({
    implicit: config.timeouts.implicit,
    pageLoad: config.timeouts.pageLoad,
    script: config.timeouts.script
  });
  
  return driver;
}

/**
 * Helper function to wait for element
 */
export async function waitForElement(driver, selector, timeout = config.timeouts.element) {
  try {
    const element = await driver.wait(
      until.elementLocated(By.css(selector)),
      timeout
    );
    await driver.wait(until.elementIsVisible(element), timeout);
    return element;
  } catch (error) {
    throw new Error(`Element not found: ${selector}`);
  }
}

/**
 * Helper function to wait for element by XPath
 */
export async function waitForElementByXPath(driver, xpath, timeout = config.timeouts.element) {
  try {
    const element = await driver.wait(
      until.elementLocated(By.xpath(xpath)),
      timeout
    );
    await driver.wait(until.elementIsVisible(element), timeout);
    return element;
  } catch (error) {
    throw new Error(`Element not found (XPath): ${xpath}`);
  }
}

/**
 * Helper function to wait for text in element
 */
export async function waitForTextInElement(driver, selector, text, timeout = config.timeouts.element) {
  const element = await waitForElement(driver, selector, timeout);
  await driver.wait(async () => {
    const elementText = await element.getText();
    return elementText.includes(text);
  }, timeout);
  return element;
}

/**
 * Helper function to click element
 */
export async function clickElement(driver, selector) {
  const element = await waitForElement(driver, selector);
  await driver.executeScript('arguments[0].scrollIntoView(true);', element);
  await driver.sleep(500); // Wait for scroll
  await element.click();
}

/**
 * Helper function to type text
 */
export async function typeText(driver, selector, text) {
  const element = await waitForElement(driver, selector);
  await element.clear();
  await element.sendKeys(text);
}

/**
 * Helper function to get element text
 */
export async function getElementText(driver, selector) {
  const element = await waitForElement(driver, selector);
  return await element.getText();
}

/**
 * Helper function to check if element exists
 */
export async function elementExists(driver, selector) {
  try {
    await driver.findElement(By.css(selector));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Take screenshot
 */
export async function takeScreenshot(driver, filename) {
  const screenshot = await driver.takeScreenshot();
  const fs = await import('fs');
  const path = await import('path');
  
  const dir = config.screenshots.directory;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filepath = path.join(dir, `${filename}.png`);
  fs.writeFileSync(filepath, screenshot, 'base64');
  return filepath;
}

export default {
  createDriver,
  waitForElement,
  waitForElementByXPath,
  waitForTextInElement,
  clickElement,
  typeText,
  getElementText,
  elementExists,
  takeScreenshot
};

