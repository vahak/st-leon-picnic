// ============================================================
// GOOGLE APPS SCRIPT - Paste this into Google Apps Script Editor
// ============================================================
//
// SETUP INSTRUCTIONS:
// 1. Go to https://sheets.google.com and create a new spreadsheet
// 2. Name it "St Leon Picnic Orders 2026"
// 3. In Row 1, add these column headers:
//    A: Timestamp | B: Order # | C: Order Type | D: Name | E: Phone
//    F: Email | G: Address | H: Pickup/Delivery Time | I: Items
//    J: Total | K: Special Instructions | L: Status | M: Driver Assignment
//    N: Ready Time | O: Picked Up/Delivered | P: Payment Status | Q: Notes
// 4. Click Extensions > Apps Script
// 5. Delete any code in the editor and paste ALL of this code
// 6. Click Deploy > New Deployment
// 7. Select type: "Web app"
// 8. Set "Execute as" to: Me
// 9. Set "Who has access" to: Anyone
// 10. Click Deploy and copy the URL
// 11. Paste that URL into the order-form.html where it says YOUR_GOOGLE_SCRIPT_URL
// 12. A "Packing List" sheet will be auto-created on the first order
// ============================================================

var PACKING_COLORS = [
  '#d9ead3', // light green
  '#d0e0f0', // light blue
  '#fce5cd', // light orange
  '#d9d2e9', // light purple
  '#fff2cc', // light yellow
  '#e6cece', // light pink
  '#c9daf8', // light indigo
  '#d5f5e3', // light mint
];

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      new Date(),              // Timestamp
      data.orderNumber,        // Order #
      data.orderType,          // Takeout or Delivery
      data.name,               // Customer name
      data.phone,              // Phone
      data.email,              // Email
      data.address,            // Delivery address (blank if takeout)
      data.time,               // Pickup/Delivery time
      data.items,              // Ordered items
      data.total,              // Total price
      data.notes,              // Special instructions
      "New",                   // Status (for tracking)
      "",                      // Driver Assignment (filled manually)
      "",                      // Ready Time (filled manually)
      "",                      // Picked Up/Delivered (filled manually)
      "",                      // Payment Status (filled manually)
      ""                       // Notes (internal, filled manually)
    ]);

    // Determine color for this order
    var rowColor = getOrderColor(sheet);

    // Apply color to the new order row
    var orderRow = sheet.getLastRow();
    sheet.getRange(orderRow, 1, 1, 17).setBackground(rowColor);

    // Check for duplicate phone number (potential combined order)
    var combineFlag = checkDuplicatePhone(sheet, data.phone, orderRow);

    // Add items to Packing List sheet
    addToPackingList(data, rowColor, combineFlag);

    // Optional: Send email notification for each new order
    // Uncomment the lines below and replace with your email
    //
    // var emailBody = "New " + data.orderType + " order from " + data.name + "\n\n";
    // emailBody += "Order #: " + data.orderNumber + "\n";
    // emailBody += "Phone: " + data.phone + "\n";
    // emailBody += "Time: " + data.time + "\n";
    // if (data.address) emailBody += "Address: " + data.address + "\n";
    // emailBody += "\nItems:\n" + data.items + "\n";
    // emailBody += "\nTotal: " + data.total + "\n";
    // if (data.notes) emailBody += "\nNotes: " + data.notes;
    //
    // MailApp.sendEmail("YOUR_EMAIL@gmail.com", "New Picnic Order #" + data.orderNumber, emailBody);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// Get the next alternating color for the Orders sheet
// ============================================================
function getOrderColor(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return PACKING_COLORS[0];

  // Check the color of the previous order row
  var prevColor = sheet.getRange(lastRow - 1, 1).getBackground();
  var prevIndex = PACKING_COLORS.indexOf(prevColor);
  var nextIndex = (prevIndex + 1) % PACKING_COLORS.length;
  return PACKING_COLORS[nextIndex];
}

// ============================================================
// Check if this phone number already placed an order
// Returns the matching order number(s) or empty string
// ============================================================
function checkDuplicatePhone(sheet, phone, currentRow) {
  if (!phone) return '';
  var lastRow = sheet.getLastRow();
  if (lastRow <= 2) return ''; // only header + this row

  // Phone is in column E (5). Check all rows except header and current
  var phoneCol = sheet.getRange(2, 5, lastRow - 2, 1).getValues(); // exclude current row
  var orderCol = sheet.getRange(2, 2, lastRow - 2, 1).getValues();

  // Normalize phone: strip non-digits
  var normalizedPhone = phone.replace(/\D/g, '');
  var matchingOrders = [];

  for (var i = 0; i < phoneCol.length; i++) {
    var existingPhone = String(phoneCol[i][0]).replace(/\D/g, '');
    if (existingPhone === normalizedPhone) {
      matchingOrders.push(String(orderCol[i][0]));
    }
  }

  return matchingOrders.length > 0 ? matchingOrders.join(', ') : '';
}

// ============================================================
// PACKING LIST — each item gets its own row with a checkbox
// Orders are color-coded to match the Orders sheet
// ============================================================
function addToPackingList(data, rowColor, combineFlag) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var packSheet = ss.getSheetByName('Packing List');

  // Create sheet with headers if it doesn't exist
  if (!packSheet) {
    packSheet = ss.insertSheet('Packing List');
    packSheet.appendRow(['Packed', 'Order #', 'Name', 'Pickup Time', 'Item', 'Qty', 'Special Instructions', 'Combine Alert']);
    packSheet.getRange('A1:H1').setFontWeight('bold');
    packSheet.setColumnWidth(1, 60);   // Packed
    packSheet.setColumnWidth(5, 250);  // Item
    packSheet.setColumnWidth(8, 200);  // Combine Alert
  }

  // Parse items (separated by newlines)
  var items = data.items.split('\n');
  var startRow = packSheet.getLastRow() + 1;

  for (var i = 0; i < items.length; i++) {
    var itemText = items[i].trim();
    if (!itemText) continue;

    // Parse "2x Chicken Kebab Platter ($40.00)" format
    var qtyMatch = itemText.match(/^(\d+)x\s+(.+?)(?:\s+\(\$[\d.]+\))?$/);
    var qty = qtyMatch ? qtyMatch[1] : '';
    var itemName = qtyMatch ? qtyMatch[2] : itemText;

    var combineText = '';
    if (i === 0 && combineFlag) {
      combineText = '⚠️ COMBINE w/ ' + combineFlag;
    }

    packSheet.appendRow([
      false,                              // Packed checkbox
      data.orderNumber,                   // Order #
      data.name,                          // Name
      data.time,                          // Pickup Time
      itemName,                           // Item
      qty,                                // Qty
      i === 0 ? (data.notes || '') : '',  // Special instructions on first row only
      combineText                         // Combine alert
    ]);
  }

  // Apply color and checkboxes to the new rows
  var endRow = packSheet.getLastRow();
  if (endRow >= startRow) {
    var range = packSheet.getRange(startRow, 1, endRow - startRow + 1, 8);
    range.setBackground(rowColor);
    // Insert checkboxes in column A
    var checkRange = packSheet.getRange(startRow, 1, endRow - startRow + 1, 1);
    checkRange.insertCheckboxes();
    // Bold the combine alert if present
    if (combineFlag) {
      var alertCell = packSheet.getRange(startRow, 8);
      alertCell.setFontWeight('bold').setFontColor('#cc0000');
    }
  }

  // Also flag the earlier order(s) on the packing list
  if (combineFlag) {
    flagEarlierOrders(packSheet, combineFlag.split(', '), data.orderNumber);
  }
}

// ============================================================
// Go back and flag earlier order(s) that share the same phone
// ============================================================
function flagEarlierOrders(packSheet, earlierOrderNumbers, newOrderNumber) {
  var lastRow = packSheet.getLastRow();
  if (lastRow <= 1) return;

  var orderCol = packSheet.getRange(2, 2, lastRow - 1, 1).getValues();
  var alertCol = packSheet.getRange(2, 8, lastRow - 1, 1).getValues();

  for (var i = 0; i < orderCol.length; i++) {
    var orderNum = String(orderCol[i][0]);
    if (earlierOrderNumbers.indexOf(orderNum) >= 0) {
      var existingAlert = String(alertCol[i][0]);
      // Only update the first row of that order if not already flagged with this order
      if (existingAlert.indexOf(newOrderNumber) < 0) {
        var newAlert = existingAlert ? existingAlert + ', ' + newOrderNumber : '⚠️ COMBINE w/ ' + newOrderNumber;
        var cell = packSheet.getRange(i + 2, 8);
        cell.setValue(newAlert).setFontWeight('bold').setFontColor('#cc0000');
      }
    }
  }
}

// Required for CORS preflight
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ result: "ready" }))
    .setMimeType(ContentService.MimeType.JSON);
}
