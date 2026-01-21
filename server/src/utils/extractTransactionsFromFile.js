import Tesseract from "tesseract.js";
import pdfParse from "pdf-parse";
import { PDFDocument } from "pdf-lib";
import Papa from "papaparse";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract transactions from uploaded bank statement (PDF or CSV)
 * @param {string} filePath - Path to uploaded file
 * @param {string} mimetype - MIME type of the file
 * @param {string} password - Optional password for encrypted PDFs
 * @returns {Promise<Array>} Array of extracted transactions
 */
export async function extractTransactionsFromFile(filePath, mimetype, password = null) {
  try {
    let transactions = [];

    if (mimetype === "application/pdf") {
      // Extract from PDF (with optional password)
      transactions = await extractFromPDF(filePath, password);
    } else if (
      mimetype === "text/csv" ||
      mimetype === "application/vnd.ms-excel"
    ) {
      // Extract from CSV
      transactions = await extractFromCSV(filePath);
    } else if (
      mimetype === "image/jpeg" ||
      mimetype === "image/jpg" ||
      mimetype === "image/png"
    ) {
      // Extract from image using OCR
      transactions = await extractFromImage(filePath);
    } else {
      throw new Error("Unsupported file type");
    }

    // Clean and validate transactions
    transactions = transactions
      .filter((t) => t.amount && t.amount > 0)
      .map((t) => ({
        ...t,
        amount: Math.abs(parseFloat(t.amount)),
        date: t.date || new Date().toISOString(),
        description: t.description || "Bank transaction",
        category: t.category || "Uncategorized",
        type: t.type || (t.amount > 0 ? "income" : "expense"),
      }));

    return transactions;
  } catch (error) {
    console.error("Error extracting transactions:", error);
    throw new Error(`Failed to extract transactions: ${error.message}`);
  }
}

/**
 * Extract transactions from PDF bank statement
 */
async function extractFromPDF(filePath, password = null) {
  try {
    console.log("📄 Starting PDF extraction...");
    console.log("🔑 Password provided:", password ? "Yes" : "No");
    
    let dataBuffer = await fs.readFile(filePath);
    let tempDecryptedPath = null;
    
    // If password is provided, decrypt the PDF using pdf-lib
    if (password) {
      console.log("🔐 Decrypting password-protected PDF...");
      console.log("🔑 Password:", password);
      console.log("🔑 Password length:", password.length);
      
      try {
        // Try to load and decrypt with pdf-lib
        console.log("🔓 Loading encrypted PDF with pdf-lib...");
        const pdfDoc = await PDFDocument.load(dataBuffer, {
          password: password,
          ignoreEncryption: false,
          updateMetadata: false,
          throwOnInvalidObject: false
        });
        
        console.log("✅ PDF loaded successfully");
        console.log("📄 PDF has", pdfDoc.getPageCount(), "pages");
        
        // Save the decrypted PDF to a buffer
        console.log("💾 Saving decrypted PDF...");
        const decryptedPdfBytes = await pdfDoc.save({
          useObjectStreams: false,
          addDefaultPage: false,
          objectsPerTick: 50
        });
        
        dataBuffer = Buffer.from(decryptedPdfBytes);
        console.log("✅ PDF decrypted successfully");
        console.log("📝 Decrypted PDF size:", dataBuffer.length);
        
      } catch (decryptError) {
        console.error("❌ PDF decryption failed:", decryptError.message);
        console.error("❌ Error stack:", decryptError.stack);
        
        // Provide helpful error message
        let errorMsg = "Unable to decrypt PDF with the provided password. ";
        
        if (decryptError.message.includes("password") || decryptError.message.includes("encrypted")) {
          errorMsg += "The password appears to be incorrect. ";
        } else if (decryptError.message.includes("Invalid")) {
          errorMsg += "The PDF file may be corrupted or use an unsupported encryption method. ";
        }
        
        errorMsg += "Please verify: 1) Password is correct (Customer ID like A52537591, DOB as DDMMYYYY, or Account Number), 2) PDF is not corrupted, 3) Try opening PDF manually with Adobe Reader and save without password.";
        
        throw new Error(errorMsg);
      }
    }
    
    // Now parse the (decrypted) PDF with pdf-parse
    try {
      console.log("📖 Parsing PDF text...");
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;
      console.log("✅ PDF parsed successfully");
      console.log("📝 Extracted text length:", text.length);
      console.log("📄 First 200 chars:", text.substring(0, 200));
      
      return parseTransactionsFromText(text);
    } catch (parseError) {
      console.error("❌ PDF parsing failed:", parseError.message);
      
      // If it fails due to encryption and no password was provided
      if ((parseError.message.includes("password") || parseError.message.includes("encrypted")) && !password) {
        throw new Error("This PDF is password-protected. Please provide the password to decrypt it.");
      }
      
      throw new Error(`Failed to parse PDF: ${parseError.message}`);
    }
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract from PDF: ${error.message}`);
  }
}

/**
 * Parse transactions from extracted text
 */
function parseTransactionsFromText(text) {
  const transactions = [];
  const lines = text.split("\n");

  console.log("📄 PDF Text Preview (first 2000 chars):", text.substring(0, 2000));
  console.log("📊 Total lines:", lines.length);
  
  // Log first 20 lines to see structure
  console.log("📋 First 20 lines:");
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    console.log(`  Line ${i}: "${lines[i]}"`);
  }

  // Try to detect bank statement format
  const textLower = text.toLowerCase();
  const hasDebitCredit = textLower.includes("debit") || textLower.includes("credit");
  const hasWithdrawalDeposit = textLower.includes("withdrawal") || textLower.includes("deposit");
  const hasParticulars = textLower.includes("particulars") || textLower.includes("description");
  
  console.log("🏦 Bank statement format detected:");
  console.log("  - Has Debit/Credit:", hasDebitCredit);
  console.log("  - Has Withdrawal/Deposit:", hasWithdrawalDeposit);
  console.log("  - Has Particulars:", hasParticulars);

  if (hasDebitCredit || hasWithdrawalDeposit || hasParticulars) {
    // Standard bank statement format
    console.log("📋 Using standard bank statement parser");
    return parseStandardBankStatement(lines, text);
  } else {
    // GPay/UPI statement format
    console.log("📱 Using GPay/UPI statement parser");
    return parseGPayStatement(lines);
  }
}

/**
 * Parse standard bank statement (with Debit/Credit or Withdrawal/Deposit columns)
 */
function parseStandardBankStatement(lines, fullText) {
  const transactions = [];
  
  console.log("🔍 Starting to parse bank statement...");
  console.log("📄 Total lines to process:", lines.length);
  
  // Date patterns - support multiple formats
  const datePatterns = [
    /^(\d{2}[-\/]\d{2}[-\/]\d{2})/,        // DD-MM-YY or DD/MM/YY
    /^(\d{2}[-\/]\d{2}[-\/]\d{4})/,        // DD-MM-YYYY or DD/MM/YYYY
    /^(\d{4}[-\/]\d{2}[-\/]\d{2})/,        // YYYY-MM-DD or YYYY/MM/DD
    /^(\d{2}\s+\w{3}\s+\d{4})/,            // DD MMM YYYY
    /^(\d{2}\s+\w{3},?\s+\d{4})/           // DD MMM, YYYY
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line || line.length < 8) continue;
    
    const lowerLine = line.toLowerCase();
    
    // Skip header rows and summary rows
    if (
      lowerLine.includes("statement of account") ||
      lowerLine.includes("account statement") ||
      (lowerLine.includes("date") && lowerLine.includes("particulars")) ||
      lowerLine === "withdrawals" ||
      lowerLine === "deposits" ||
      lowerLine === "balance" ||
      lowerLine.includes("opening balance") ||
      lowerLine.includes("closing balance") ||
      lowerLine.includes("page total") ||
      lowerLine.includes("grand total") ||
      lowerLine.includes("this is a system") ||
      lowerLine.includes("date/time:") ||
      lowerLine.includes("chq.no") ||
      lowerLine.includes("transaction") && lowerLine.includes("date") ||
      lowerLine.includes("sl.no") ||
      lowerLine.includes("s.no")
    ) {
      continue;
    }
    
    // Check if line starts with a date using any pattern
    let dateMatch = null;
    let dateStr = null;
    
    for (const pattern of datePatterns) {
      dateMatch = line.match(pattern);
      if (dateMatch) {
        dateStr = dateMatch[1];
        break;
      }
    }
    
    if (!dateStr) continue;
    
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) {
      continue;
    }
    
    // Remove the date to get rest of line
    const restOfLine = line.substring(dateStr.length).trim();
    
    // Extract all numbers (potential amounts)
    const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/g;
    const amounts = [];
    let match;
    
    while ((match = amountPattern.exec(restOfLine)) !== null) {
      const amountStr = match[1].replace(/,/g, "");
      const amount = parseFloat(amountStr);
      
      // Filter out: years (2024, 2025), very large numbers, very small numbers
      if (amount >= 1 && amount <= 1000000 && !match[1].match(/^20\d{2}$/)) {
        amounts.push(amount);
      }
    }
    
    if (amounts.length === 0) continue;
    
    // Extract particulars/description
    let particulars = restOfLine;
    
    // Remove amounts from particulars
    for (const amount of amounts) {
      const amountWithCommas = amount.toLocaleString('en-IN');
      particulars = particulars.replace(amountWithCommas, "");
      particulars = particulars.replace(amount.toString(), "");
    }
    
    // Clean up particulars
    particulars = particulars
      .replace(/Cr/gi, "")
      .replace(/Dr/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    
    // Determine transaction type based on keywords and amount position
    let withdrawal = null;
    let deposit = null;
    
    // Check for keywords that indicate income/deposit
    const isIncome = 
      lowerLine.includes("interest") ||
      lowerLine.includes("refund") ||
      lowerLine.includes("cashfree") ||
      lowerLine.includes("credit") ||
      lowerLine.includes("deposit") ||
      lowerLine.includes("received") ||
      lowerLine.includes("salary") ||
      lowerLine.includes("transfer in");
    
    // Check for keywords that indicate expense/withdrawal
    const isExpense =
      lowerLine.includes("withdrawal") ||
      lowerLine.includes("debit") ||
      lowerLine.includes("payment") ||
      lowerLine.includes("purchase") ||
      lowerLine.includes("transfer out") ||
      lowerLine.includes("atm") ||
      lowerLine.includes("pos");
    
    if (amounts.length === 1) {
      // Only one amount - use keywords to determine type
      if (isIncome) {
        deposit = amounts[0];
      } else {
        withdrawal = amounts[0];
      }
    } else if (amounts.length === 2) {
      // Two amounts - likely transaction + balance
      const transactionAmount = amounts[0];
      
      if (isIncome) {
        deposit = transactionAmount;
      } else {
        withdrawal = transactionAmount;
      }
    } else if (amounts.length >= 3) {
      // Multiple amounts - last is usually balance
      // Second-to-last might be transaction
      const transactionAmounts = amounts.slice(0, -1);
      
      if (transactionAmounts.length === 1) {
        if (isIncome) {
          deposit = transactionAmounts[0];
        } else {
          withdrawal = transactionAmounts[0];
        }
      } else if (transactionAmounts.length === 2) {
        // Two transaction amounts - likely withdrawal and deposit columns
        // First is usually withdrawal, second is deposit
        withdrawal = transactionAmounts[0];
        deposit = transactionAmounts[1];
      }
    }
    
    // Create transactions
    if (withdrawal && withdrawal > 0) {
      transactions.push({
        date: date.toISOString(),
        amount: withdrawal,
        description: particulars || "Withdrawal",
        type: "expense",
        category: categorizeTransaction(particulars, "expense"),
      });
      console.log(`   💸 EXPENSE: ₹${withdrawal} - ${particulars.substring(0, 40)}`);
    }
    
    if (deposit && deposit > 0) {
      transactions.push({
        date: date.toISOString(),
        amount: deposit,
        description: particulars || "Deposit",
        type: "income",
        category: categorizeTransaction(particulars, "income"),
      });
      console.log(`   💰 INCOME: ₹${deposit} - ${particulars.substring(0, 40)}`);
    }
  }
  
  console.log(`\n✅ Extracted ${transactions.length} transactions from bank statement`);
  
  // If no transactions found, log helpful debug info
  if (transactions.length === 0) {
    console.log("❌ No transactions found! Debug info:");
    console.log("📄 First 50 lines of PDF:");
    for (let i = 0; i < Math.min(50, lines.length); i++) {
      console.log(`  ${i}: ${lines[i]}`);
    }
  }
  
  return transactions;
}

/**
 * Parse date string in various formats
 */
function parseDate(dateStr) {
  try {
    // Try DD-MM-YYYY or DD/MM/YYYY
    if (dateStr.match(/^\d{2}[-\/]\d{2}[-\/]\d{4}$/)) {
      const parts = dateStr.split(/[-\/]/);
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    
    // Try DD-MM-YY or DD/MM/YY
    if (dateStr.match(/^\d{2}[-\/]\d{2}[-\/]\d{2}$/)) {
      const parts = dateStr.split(/[-\/]/);
      const year = parseInt(parts[2]) + (parseInt(parts[2]) > 50 ? 1900 : 2000);
      return new Date(year, parts[1] - 1, parts[0]);
    }
    
    // Try YYYY-MM-DD or YYYY/MM/DD
    if (dateStr.match(/^\d{4}[-\/]\d{2}[-\/]\d{2}$/)) {
      const parts = dateStr.split(/[-\/]/);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    
    // Try DD MMM YYYY (e.g., 15 Jan 2025)
    if (dateStr.match(/^\d{2}\s+\w{3}\s+\d{4}$/)) {
      return new Date(dateStr);
    }
    
    // Try DD MMM, YYYY (e.g., 15 Jan, 2025)
    if (dateStr.match(/^\d{2}\s+\w{3},?\s+\d{4}$/)) {
      return new Date(dateStr.replace(",", ""));
    }
    
    // Fallback to Date.parse
    return new Date(dateStr);
  } catch (e) {
    console.error("Date parsing error:", e);
    return null;
  }
}

/**
 * Parse GPay/UPI statement format
 */
function parseGPayStatement(lines) {
  const transactions = [];
  
  // GPay specific patterns (handling concatenated text)
  const gpayDatePattern = /(\d{2}\s*\w{3},?\s*\d{4})/; // "01 Nov, 2025" or "01Nov,2025"
  const gpayTimePattern = /(\d{2}:\d{2}\s*[AP]M)/; // "08:30 AM" or "08:30AM"
  const amountPattern = /₹\s*([\d,]+\.?\d*)/; // ₹527.88

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines, headers, and summary rows
    if (
      !line ||
      line.toLowerCase().includes("transactionstatement") ||
      line.toLowerCase().includes("transaction statement") ||
      line.toLowerCase().includes("date&time") ||
      line.toLowerCase().includes("date & time") ||
      line.toLowerCase().includes("transactiondetails") ||
      line.toLowerCase().includes("transaction details") ||
      line.toLowerCase().includes("statementperiod") ||
      line.toLowerCase().includes("statement period") ||
      line.toLowerCase().includes("page")
    ) {
      continue;
    }

    // Skip summary lines that show totals (but not transaction lines)
    const lowerLine = line.toLowerCase();
    if (
      (lowerLine.includes("sent") || lowerLine.includes("received")) &&
      !lowerLine.includes("paidto") &&
      !lowerLine.includes("paid to") &&
      !lowerLine.includes("receivedfrom") &&
      !lowerLine.includes("received from") &&
      lowerLine.match(/₹[\d,]+\.?\d*/)
    ) {
      // This is likely a summary line like "Sent ₹37,638.88"
      continue;
    }

    // Check for GPay transaction patterns (handle concatenated text)
    // Format: "Paid to" or "Received from" in the line
    const isPaid = line.toLowerCase().includes("paidto") || line.toLowerCase().includes("paid to");
    const isReceived = line.toLowerCase().includes("receivedfrom") || line.toLowerCase().includes("received from");

    if (isPaid || isReceived) {
      console.log(`💰 Found GPay transaction: "${line.substring(0, 100)}..."`);
      
      // Look for date in current or previous lines
      let dateStr = null;
      let dateMatch = line.match(gpayDatePattern);
      
      if (!dateMatch && i > 0) {
        // Check previous line for date
        dateMatch = lines[i - 1]?.match(gpayDatePattern);
      }

      if (dateMatch) {
        dateStr = dateMatch[1];
      }

      // Look for amount in current or next lines
      let amount = 0;
      let amountMatch = line.match(amountPattern);
      
      if (!amountMatch && i < lines.length - 1) {
        // Check next few lines for amount
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          amountMatch = lines[j]?.match(amountPattern);
          if (amountMatch) break;
        }
      }

      if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ""));
      }

      // Parse date
      let date = new Date();
      if (dateStr) {
        try {
          // Convert "01 Nov, 2025" to proper date
          const parts = dateStr.replace(",", "").split(" ");
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = new Date(Date.parse(parts[1] + " 1, 2000")).getMonth();
            const year = parseInt(parts[2]);
            date = new Date(year, month, day);
          }
        } catch (e) {
          console.error("Date parsing error:", e);
        }
      }

      // Extract description (merchant/person name)
      let description = line;
      if (isPaid) {
        description = line.replace(/paidto/i, "").replace(/paid to/i, "").trim();
      } else if (isReceived) {
        description = line.replace(/receivedfrom/i, "").replace(/received from/i, "").trim();
      }

      // Clean up description - remove UPI and bank details (handle concatenated text)
      description = description.split(/UPI/i)[0].trim();
      description = description.split(/Paidby/i)[0].trim();
      description = description.split(/Paid by/i)[0].trim();
      description = description.split(/Paidto/i)[0].trim();
      description = description.split(/Paid to/i)[0].trim();
      description = description.substring(0, 200);

      const type = isReceived ? "income" : "expense";

      if (amount > 0 && !isNaN(date.getTime())) {
        transactions.push({
          date: date.toISOString(),
          amount: Math.abs(amount),
          description: description || (isReceived ? "Payment received" : "Payment made"),
          type,
          category: categorizeTransaction(description, type),
        });
      }
    }
  }

  console.log(`✅ Extracted ${transactions.length} transactions from GPay statement`);
  return transactions;
}

/**
 * Extract transactions from CSV file
 */
async function extractFromCSV(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");

    return new Promise((resolve, reject) => {
      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const transactions = results.data.map((row) => {
              // Common CSV column names (case-insensitive)
              const dateCol =
                row.Date ||
                row.date ||
                row.DATE ||
                row["Transaction Date"] ||
                row["Txn Date"];
              const amountCol =
                row.Amount ||
                row.amount ||
                row.AMOUNT ||
                row["Transaction Amount"] ||
                row.Debit ||
                row.Credit;
              const descCol =
                row.Description ||
                row.description ||
                row.DESCRIPTION ||
                row.Narration ||
                row.narration ||
                row.Particulars;
              const typeCol =
                row.Type || row.type || row.TYPE || row["Transaction Type"];

              // Parse date
              let date = null;
              
              if (dateCol) {
                // Try DD-MM-YYYY or DD/MM/YYYY format first (Indian format)
                const ddmmyyyyPattern = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/;
                const match = dateCol.match(ddmmyyyyPattern);
                
                if (match) {
                  const day = parseInt(match[1]);
                  const month = parseInt(match[2]) - 1; // Month is 0-indexed
                  const year = parseInt(match[3]);
                  date = new Date(year, month, day);
                  console.log(`📅 CSV Date converted: ${dateCol} -> ${date.toISOString().split('T')[0]}`);
                } else {
                  // Try standard Date parsing as fallback
                  date = new Date(dateCol);
                }
              }
              
              // Validate date
              if (!date || isNaN(date.getTime())) {
                console.warn(`⚠️ Invalid date in CSV: ${dateCol}`);
                date = new Date(); // Fallback to today
              }

              // Parse amount
              let amount = parseFloat(
                String(amountCol || "0").replace(/[₹,\s]/g, ""),
              );

              // Determine type
              const debitCol = row.Debit || row.debit || row.DEBIT;
              const creditCol = row.Credit || row.credit || row.CREDIT;
              const description = String(descCol || "").toLowerCase();

              let type = "expense";
              
              // Priority 1: Check for GPay keywords in description
              if (description.includes("received")) {
                type = "income";
              } else if (description.includes("paid")) {
                type = "expense";
              } else if (creditCol && parseFloat(creditCol.replace(/[₹,\s]/g, "")) > 0) {
                // Priority 2: Check Credit column
                type = "income";
                amount = parseFloat(creditCol.replace(/[₹,\s]/g, ""));
              } else if (
                debitCol &&
                parseFloat(debitCol.replace(/[₹,\s]/g, "")) > 0
              ) {
                // Priority 3: Check Debit column
                type = "expense";
                amount = parseFloat(debitCol.replace(/[₹,\s]/g, ""));
              } else if (typeCol) {
                // Priority 4: Check Type column
                type = typeCol.toLowerCase().includes("credit")
                  ? "income"
                  : "expense";
              }

              const finalDescription = String(descCol || "Transaction").substring(
                0,
                200,
              );

              return {
                date: date.toISOString(),
                amount: Math.abs(amount),
                description: finalDescription,
                type,
                category: categorizeTransaction(finalDescription, type),
              };
            });

            resolve(transactions.filter((t) => t.amount > 0));
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  } catch (error) {
    console.error("CSV extraction error:", error);
    throw new Error(`Failed to extract from CSV: ${error.message}`);
  }
}

/**
 * Extract transactions from image using OCR (UPI screenshots)
 */
async function extractFromImage(filePath) {
  try {
    console.log("📸 Starting OCR extraction from image...");
    
    const {
      data: { text },
    } = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log("✅ OCR completed");
    console.log("📝 Extracted text length:", text.length);
    console.log("📄 First 500 chars:", text.substring(0, 500));

    const transactions = [];
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    console.log("📊 Total lines:", lines.length);

    // Detect UPI app type
    const textLower = text.toLowerCase();
    const isGooglePay = textLower.includes("google pay") || textLower.includes("gpay");
    const isPhonePe = textLower.includes("phonepe") || textLower.includes("phone pe");
    const isPaytm = textLower.includes("paytm");
    const isAmazonPay = textLower.includes("amazon pay");

    console.log("🏦 UPI App Detection:");
    console.log("  - Google Pay:", isGooglePay);
    console.log("  - PhonePe:", isPhonePe);
    console.log("  - Paytm:", isPaytm);
    console.log("  - Amazon Pay:", isAmazonPay);

    // Enhanced patterns for UPI transactions
    const datePatterns = [
      /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+\d{4})/i, // "15 Jan 2025" or "15 Jan, 2025"
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,  // "15-01-2025" or "15/01/25"
      /(\d{2,4}[-\/]\d{1,2}[-\/]\d{1,2})/   // "2025-01-15"
    ];

    const amountPattern = /₹\s*([\d,]+\.?\d*)/g;
    const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/;

    // UPI-specific keywords
    const paidKeywords = ["paid to", "paid", "sent to", "sent", "payment to", "transferred to"];
    const receivedKeywords = ["received from", "received", "from", "payment from", "transferred from"];
    const successKeywords = ["success", "successful", "completed", "done"];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Skip header/footer lines
      if (
        lowerLine.includes("transaction") && lowerLine.includes("history") ||
        lowerLine.includes("statement") ||
        lowerLine.includes("balance") && !lowerLine.includes("₹") ||
        lowerLine.includes("page") ||
        lowerLine.length < 5
      ) {
        continue;
      }

      // Check for transaction indicators
      const isPaid = paidKeywords.some(kw => lowerLine.includes(kw));
      const isReceived = receivedKeywords.some(kw => lowerLine.includes(kw));
      const isSuccess = successKeywords.some(kw => lowerLine.includes(kw));

      if (!isPaid && !isReceived) continue;

      console.log(`\n💰 Found potential transaction at line ${i}: "${line.substring(0, 80)}..."`);

      // Extract date (check current and nearby lines)
      let date = null;
      let dateStr = null;

      for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 2); j++) {
        for (const pattern of datePatterns) {
          const match = lines[j].match(pattern);
          if (match) {
            dateStr = match[1];
            date = parseUPIDate(dateStr);
            if (date && !isNaN(date.getTime())) {
              console.log(`  📅 Date found: ${dateStr} -> ${date.toISOString().split('T')[0]}`);
              break;
            }
          }
        }
        if (date) break;
      }

      if (!date) {
        console.log("  ⚠️ No valid date found, using today");
        date = new Date();
      }

      // Extract amount (check current and nearby lines)
      let amount = 0;
      let amountStr = null;

      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 3); j++) {
        const amountMatches = [...lines[j].matchAll(amountPattern)];
        if (amountMatches.length > 0) {
          // Take the largest amount (usually the transaction amount)
          const amounts = amountMatches.map(m => parseFloat(m[1].replace(/,/g, "")));
          amount = Math.max(...amounts);
          amountStr = amountMatches[amountMatches.length - 1][0];
          console.log(`  💵 Amount found: ${amountStr} = ₹${amount}`);
          break;
        }
      }

      if (amount <= 0) {
        console.log("  ⚠️ No valid amount found, skipping");
        continue;
      }

      // Extract description (merchant/person name)
      let description = line;

      // Remove common UPI keywords
      const removeKeywords = [
        ...paidKeywords, 
        ...receivedKeywords, 
        ...successKeywords,
        "upi", "transaction", "payment", "transfer"
      ];

      for (const kw of removeKeywords) {
        description = description.replace(new RegExp(kw, "gi"), "");
      }

      // Remove amount and date from description
      if (amountStr) {
        description = description.replace(amountStr, "");
      }
      if (dateStr) {
        description = description.replace(dateStr, "");
      }

      // Remove UPI ID patterns (like xyz@paytm, abc@ybl)
      description = description.replace(/[\w.-]+@[\w.-]+/g, "");

      // Remove phone numbers
      description = description.replace(/\d{10}/g, "");

      // Clean up
      description = description
        .replace(/[₹:•\-_|]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 200);

      // If description is too short, try to get merchant name from nearby lines
      if (description.length < 3) {
        for (let j = i + 1; j <= Math.min(lines.length - 1, i + 3); j++) {
          const nextLine = lines[j].trim();
          if (
            nextLine.length > 3 && 
            nextLine.length < 100 &&
            !nextLine.match(/₹/) &&
            !nextLine.match(/\d{10}/) &&
            !nextLine.match(/[\w.-]+@[\w.-]+/)
          ) {
            description = nextLine;
            console.log(`  📝 Description from next line: "${description}"`);
            break;
          }
        }
      }

      const type = isReceived ? "income" : "expense";

      if (amount > 0 && !isNaN(date.getTime())) {
        const transaction = {
          date: date.toISOString(),
          amount: Math.abs(amount),
          description: description || (isReceived ? "Payment received" : "Payment made"),
          type,
          category: categorizeTransaction(description, type),
        };

        transactions.push(transaction);
        console.log(`  ✅ Transaction added: ${type.toUpperCase()} ₹${amount} - ${description.substring(0, 40)}`);
      }
    }

    console.log(`\n✅ Extracted ${transactions.length} transactions from UPI screenshot`);

    if (transactions.length === 0) {
      console.log("⚠️ No transactions found. Debug info:");
      console.log("📄 First 20 lines:");
      for (let i = 0; i < Math.min(20, lines.length); i++) {
        console.log(`  ${i}: ${lines[i]}`);
      }
    }

    return transactions;
  } catch (error) {
    console.error("OCR extraction error:", error);
    throw new Error(`Failed to extract from image: ${error.message}`);
  }
}

/**
 * Parse UPI date formats
 */
function parseUPIDate(dateStr) {
  try {
    // Try "15 Jan 2025" or "15 Jan, 2025"
    if (dateStr.match(/^\d{1,2}\s+\w{3}/i)) {
      const cleaned = dateStr.replace(",", "").trim();
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) return date;
    }

    // Try DD-MM-YYYY or DD/MM/YYYY
    if (dateStr.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/)) {
      const parts = dateStr.split(/[-\/]/);
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      let year = parseInt(parts[2]);
      
      if (year < 100) {
        year += year > 50 ? 1900 : 2000;
      }
      
      return new Date(year, month, day);
    }

    // Try YYYY-MM-DD or YYYY/MM/DD
    if (dateStr.match(/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/)) {
      const parts = dateStr.split(/[-\/]/);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    // Fallback
    return new Date(dateStr);
  } catch (e) {
    console.error("UPI date parsing error:", e);
    return null;
  }
}

/**
 * Simple transaction categorization
 */
function categorizeTransaction(description, type) {
  const desc = description.toLowerCase();

  if (type === "income") {
    if (desc.includes("salary") || desc.includes("wage"))
      return "Salary & Wages";
    if (desc.includes("interest")) return "Interest Income";
    if (desc.includes("dividend")) return "Investment Returns";
    if (desc.includes("received") || desc.includes("payment received"))
      return "Payment Received";
    return "Other Income";
  }

  // Expense categories
  if (desc.includes("rent")) return "Housing & Rent";
  if (desc.includes("electric") || desc.includes("water") || desc.includes("gas"))
    return "Utilities";
  if (
    desc.includes("grocery") ||
    desc.includes("food") ||
    desc.includes("restaurant") ||
    desc.includes("swiggy") ||
    desc.includes("zomato")
  )
    return "Food & Groceries";
  if (desc.includes("transport") || desc.includes("fuel") || desc.includes("uber") || desc.includes("ola"))
    return "Transportation";
  if (desc.includes("medical") || desc.includes("health") || desc.includes("doctor") || desc.includes("pharma"))
    return "Healthcare";
  if (desc.includes("entertainment") || desc.includes("movie") || desc.includes("netflix") || desc.includes("prime"))
    return "Entertainment";
  if (desc.includes("shopping") || desc.includes("amazon") || desc.includes("flipkart") || desc.includes("myntra"))
    return "Shopping";
  if (desc.includes("insurance")) return "Insurance";
  if (desc.includes("loan") || desc.includes("emi")) return "Loan Repayment";
  if (desc.includes("recharge") || desc.includes("mobile") || desc.includes("internet"))
    return "Utilities";
  if (desc.includes("paid") || desc.includes("payment"))
    return "Payment Made";

  return "Other Expenses";
}
