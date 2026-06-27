const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function createGuide() {
  const pdfDoc = await PDFDocument.create();
  
  // Load standard Helvetica fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pagesData = [
    {
      title: "ARGUS CARGO MANAGEMENT SYSTEM",
      subtitle: "Comprehensive Platform Features & User Guide",
      isCover: true,
      bullets: [
        "A premium enterprise freight and communications platform.",
        "Tailored for Cargo Operators, Sales Persons, Calling Agents, Admins, and Customers.",
        "Equipped with WebSockets, server-side 3CX Webhook integrations, and automated PDF builders."
      ]
    },
    {
      title: "1. Core Overview & Live Dashboard",
      subtitle: "Real-Time Operations & Shared Workspace Hub",
      bullets: [
        "Dashboard Overview: Provides a birds-eye view of all ongoing shipments, pending inquiries, and active quotes.",
        "Unread Message Indicators: Uses dynamic badges in the sidebar to flag new customer/vendor email replies instantly.",
        "Real-Time Notifications: System-wide sounds and alerts notify operators when status updates occur.",
        "Premium Layout: Fully responsive dark-mode and light-mode compatible layout using glassmorphism aesthetics."
      ]
    },
    {
      title: "2. Freight & RFQ Management",
      subtitle: "Handling Shipments, Vendor Requests, and Invoicing",
      bullets: [
        "New RFQ Creator: Easily input cargo specifications (POL, POD, commodity, dimensions, weight, carrier options).",
        "Sent RFQs Page: A master log tracking all sent requests. Color-coded status updates (Pending, Quoted, Confirmed).",
        "Confirmed Shipments: Active bookings containing automated PDF generation and cargo documents.",
        "Summary Dashboard: Consolidated logs displaying total costs, profits, and carrier analytics.",
        "Address Book: Shared address book mapping customer/vendor details, emails, and default ports."
      ]
    },
    {
      title: "3. Calling Agent Portal & Enquiries",
      subtitle: "Telesales, Lead Capture, and 3CX Telephony Integration",
      bullets: [
        "Call Enquiry Creator: A manual form allowing agents to log caller data, contact info, and notes.",
        "My Enquiries Table: Displays logs of all dialed and received inquiries with the exact Time of Call.",
        "Round-Robin Lead Assignment: Marking an inquiry as a 'Lead' triggers an algorithm assigning it to the next Sales Person.",
        "3CX Server Integration: Server-side CRM XML integration routes call logs to the database automatically when a call ends.",
        "Global Call Popup: When a call terminates, the agent receives an immediate global modal alert to catalog the log."
      ]
    },
    {
      title: "4. Admin Control Center",
      subtitle: "System Administration, Security, and Configuration Settings",
      bullets: [
        "User Registration Page: Admin panel to create Operator, Admin, Sales, Calling Agent, or Customer accounts.",
        "3CX Extension Mapping: Inline editable grid enabling admins to bind 3CX extension numbers to ARGUS usernames.",
        "SMTP Email Integration: Configures individual IMAP and SMTP configurations for safe and secure client emailing.",
        "Account Actions: Active account stalling (suspend logins) and permanent user deletion panels."
      ]
    },
    {
      title: "5. Automated Quotation Engine",
      subtitle: "Professional PDFs, Smart Port Parsing, and Terms Merging",
      bullets: [
        "DOCX-to-PDF Conversion: Compiles shipment data into structured PDFs using headless server-side conversion.",
        "Smart Port Extraction: Automatically parses port parentheticals (e.g. Coimbatore International Airport (CJB) -> CJB) for routing codes.",
        "Static PDF Merging: Automatically appends your premium static terms page (Argus_Ambient_Premium_Quotation_2.pdf) as the 2nd page.",
        "Email Automation: One-click emailing of generated quotes directly to customer mailboxes."
      ]
    }
  ];

  for (const item of pagesData) {
    const page = pdfDoc.addPage([612, 792]); // Standard Letter size
    const { width, height } = page.getSize();
    
    // Draw Background Gradient / Colors (Premium Navy Theme)
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.02, 0.05, 0.1) // Navy background
    });

    // Draw Gold Top Accent Border
    page.drawRectangle({
      x: 0,
      y: height - 10,
      width,
      height: 10,
      color: rgb(0.96, 0.69, 0.22) // Gold
    });

    if (item.isCover) {
      // Draw Cover Graphic Frame
      page.drawRectangle({
        x: 40,
        y: 40,
        width: width - 80,
        height: height - 100,
        borderColor: rgb(0.96, 0.69, 0.22),
        borderWidth: 2
      });

      // Cover Title
      page.drawText(item.title, {
        x: 60,
        y: height - 200,
        size: 24,
        font: fontBold,
        color: rgb(0.96, 0.69, 0.22)
      });

      // Cover Subtitle
      page.drawText(item.subtitle, {
        x: 60,
        y: height - 240,
        size: 16,
        font: fontRegular,
        color: rgb(1, 1, 1)
      });

      // Draw Separator Line
      page.drawLine({
        start: { x: 60, y: height - 260 },
        end: { x: width - 80, y: height - 260 },
        color: rgb(0.96, 0.69, 0.22),
        thickness: 1
      });

      // Intro text
      let currentY = height - 320;
      for (const text of item.bullets) {
        page.drawText(text, {
          x: 60,
          y: currentY,
          size: 11,
          font: fontRegular,
          color: rgb(0.8, 0.8, 0.8),
          lineHeight: 16
        });
        currentY -= 40;
      }
      
      // Footer
      page.drawText("ARGUS Shipping & Logistics System Guide", {
        x: 60,
        y: 80,
        size: 10,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5)
      });
      
    } else {
      // Standard Page Title
      page.drawText(item.title, {
        x: 50,
        y: height - 80,
        size: 20,
        font: fontBold,
        color: rgb(0.96, 0.69, 0.22)
      });

      // Subtitle
      page.drawText(item.subtitle, {
        x: 50,
        y: height - 105,
        size: 13,
        font: fontRegular,
        color: rgb(1, 1, 1)
      });

      // Divider Line
      page.drawLine({
        start: { x: 50, y: height - 120 },
        end: { x: width - 50, y: height - 120 },
        color: rgb(0.2, 0.3, 0.5),
        thickness: 1
      });

      // Bullets (Features lists)
      let currentY = height - 170;
      for (const text of item.bullets) {
        // Draw gold bullet dot
        page.drawCircle({
          x: 60,
          y: currentY + 4,
          radius: 3,
          color: rgb(0.96, 0.69, 0.22)
        });

        // Split text for bold title vs description if it contains a colon
        const parts = text.split(': ');
        if (parts.length > 1) {
          const boldPart = parts[0] + ": ";
          const regularPart = parts.slice(1).join(': ');

          // Draw bold section title
          page.drawText(boldPart, {
            x: 75,
            y: currentY,
            size: 11,
            font: fontBold,
            color: rgb(1, 1, 1)
          });

          // Calculate offset to write description (approx 6.5px per bold character)
          const boldOffset = boldPart.length * 6.8;
          
          // Draw regular part (wrapping simplified as single line for standard bullets)
          page.drawText(regularPart, {
            x: 75 + boldOffset,
            y: currentY,
            size: 11,
            font: fontRegular,
            color: rgb(0.8, 0.8, 0.8)
          });
        } else {
          page.drawText(text, {
            x: 75,
            y: currentY,
            size: 11,
            font: fontRegular,
            color: rgb(0.8, 0.8, 0.8)
          });
        }

        currentY -= 45;
      }

      // Page Footer
      page.drawLine({
        start: { x: 50, y: 60 },
        end: { x: width - 50, y: 60 },
        color: rgb(0.2, 0.3, 0.5),
        thickness: 0.5
      });

      page.drawText("ARGUS Features & Operations Guide", {
        x: 50,
        y: 45,
        size: 9,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5)
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(__dirname, '../../public/Argus_Features_Guide.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`✅ Success: PDF generated successfully at ${outputPath}`);
}

createGuide().catch(err => {
  console.error("❌ Failed to create PDF:", err);
  process.exit(1);
});
