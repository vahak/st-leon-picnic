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

    // Add items to Packing List sheet
    addToPackingList(data);

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
// PACKING LIST — each item gets its own row with a checkbox
// Orders are color-coded so the packer can see groupings
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

function addToPackingList(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var packSheet = ss.getSheetByName('Packing List');

  // Create sheet with headers if it doesn't exist
  if (!packSheet) {
    packSheet = ss.insertSheet('Packing List');
    packSheet.appendRow(['Packed', 'Order #', 'Name', 'Pickup Time', 'Item', 'Qty', 'Special Instructions']);
    packSheet.getRange('A1:G1').setFontWeight('bold');
    packSheet.setColumnWidth(1, 60);   // Packed
    packSheet.setColumnWidth(5, 250);  // Item
  }

  // Pick a color based on current row count to alternate between orders
  var lastRow = packSheet.getLastRow();
  var colorIndex = 0;
  if (lastRow > 1) {
    var prevOrder = packSheet.getRange(lastRow, 2).getValue();
    var prevColor = packSheet.getRange(lastRow, 2).getBackground();
    var prevColorIndex = PACKING_COLORS.indexOf(prevColor);
    if (prevOrder === data.orderNumber) {
      colorIndex = prevColorIndex >= 0 ? prevColorIndex : 0;
    } else {
      colorIndex = (prevColorIndex + 1) % PACKING_COLORS.length;
    }
  }
  var rowColor = PACKING_COLORS[colorIndex];

  // Parse items (separated by newlines)
  var items = data.items.split('\n');
  var startRow = lastRow + 1;

  for (var i = 0; i < items.length; i++) {
    var itemText = items[i].trim();
    if (!itemText) continue;

    // Parse "2x Chicken Kebab Platter ($40.00)" format
    var qtyMatch = itemText.match(/^(\d+)x\s+(.+?)(?:\s+\(\$[\d.]+\))?$/);
    var qty = qtyMatch ? qtyMatch[1] : '';
    var itemName = qtyMatch ? qtyMatch[2] : itemText;

    packSheet.appendRow([
      false,                              // Packed checkbox
      data.orderNumber,                   // Order #
      data.name,                          // Name
      data.time,                          // Pickup Time
      itemName,                           // Item
      qty,                                // Qty
      i === 0 ? (data.notes || '') : ''   // Special instructions on first row only
    ]);
  }

  // Apply color and checkboxes to the new rows
  var endRow = packSheet.getLastRow();
  if (endRow >= startRow) {
    var range = packSheet.getRange(startRow, 1, endRow - startRow + 1, 7);
    range.setBackground(rowColor);
    // Insert checkboxes in column A
    var checkRange = packSheet.getRange(startRow, 1, endRow - startRow + 1, 1);
    checkRange.insertCheckboxes();
  }
}

// Required for CORS preflight
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ result: "ready" }))
    .setMimeType(ContentService.MimeType.JSON);
}
