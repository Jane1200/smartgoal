import Tesseract from "tesseract.js";
import pdfParse from "pdf-parse";
import Papa from "papaparse";
import fs from "fs/promises";

/**
 * Extract transactions from uploaded bank statement (PDF or CSV)
 * @param {string} filePath - Path to uploaded file
 * @param {string} mimetype - MIME type of the file
 * @returns {Promise<Array>} Array of extracted transactions
 */
export async function extractTransactionsFromFile(filePath, mimetype) {
  try {
    let transactions = [];

    if (mimetype === "application/pdf") {
      // Extract from PDF
      transactions = await extractFromPDF(filePath);
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
async function extractFromPDF(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    const transactions = [];
    const lines = text.split("\n");

    console.log("📄 PDF Text Preview (first 500 chars):", text.substring(0, 500));
    console.log("📊 Total lines:", lines.length);

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
        console.log(`💰 Found transaction line: "${line.substring(0, 100)}..."`);
        
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

    console.log(`✅ Extracted ${transactions.length} transactions from GPay PDF`);
    return transactions;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error(`Failed to extract from PDF: ${error.message}`);
  }
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
              let date = new Date(dateCol);
              if (isNaN(date.getTime())) {
                // Try DD-MM-YYYY format
                const parts = dateCol?.split(/[-\/]/);
                if (parts && parts.length === 3) {
                  date = new Date(parts[2], parts[1] - 1, parts[0]);
                }
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
 * Extract transactions from image using OCR
 */
async function extractFromImage(filePath) {
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(filePath, "eng", {
      logger: (m) => console.log(m),
    });

    const transactions = [];
    const lines = text.split("\n");

    const datePattern =
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{2,4}[-\/]\d{1,2}[-\/]\d{1,2})/;
    const amountPattern = /₹?\s*[\d,]+\.?\d*/;

    for (const line of lines) {
      const dateMatch = line.match(datePattern);
      const amountMatches = line.match(new RegExp(amountPattern, "g"));

      if (dateMatch && amountMatches) {
        const dateStr = dateMatch[1];
        const dateParts = dateStr.split(/[-\/]/);
        const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);

        const amountStr = amountMatches[amountMatches.length - 1];
        const amount = parseFloat(amountStr.replace(/[₹,\s]/g, ""));

        const descStart = line.indexOf(dateMatch[0]) + dateMatch[0].length;
        const descEnd = line.indexOf(amountStr);
        const description = line
          .substring(descStart, descEnd)
          .trim()
          .substring(0, 200);

        const type = line.match(/\bCR\b|credit/i) ? "income" : "expense";

        if (amount > 0 && !isNaN(date.getTime())) {
          transactions.push({
            date: date.toISOString(),
            amount: Math.abs(amount),
            description: description || "Transaction",
            type,
            category: categorizeTransaction(description, type),
          });
        }
      }
    }

    return transactions;
  } catch (error) {
    console.error("OCR extraction error:", error);
    throw new Error(`Failed to extract from image: ${error.message}`);
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
