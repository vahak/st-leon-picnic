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

// Required for CORS preflight
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ result: "ready" }))
    .setMimeType(ContentService.MimeType.JSON);
}
