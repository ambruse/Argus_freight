const lib = require('@matbee/libreoffice-converter');
const wasmLoader = require('@matbee/libreoffice-converter/wasm/loader');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function runDiagnostics() {
  console.log("=== RUNNING PDF GENERATION DIAGNOSTICS ===");

  // 1. Check if CLI LibreOffice is available
  exec('soffice --version', async (cliErr, stdout, stderr) => {
    if (cliErr) {
      console.log("❌ System LibreOffice CLI (soffice) is NOT available on this server:", cliErr.message);
    } else {
      console.log("✅ System LibreOffice CLI (soffice) is AVAILABLE:", stdout.trim());
    }

    // 2. Test WASM converter
    try {
      console.log("\nInitializing LibreOfficeConverter with WASM loader...");
      console.log("Memory usage before WASM init:", process.memoryUsage());
      const converter = await lib.createConverter({ wasmLoader });
      console.log("✅ Converter initialized successfully!");
      
      const inputPath = path.join(__dirname, '../public/Argus_Ambient_Premium_Quotation.docx');
      if (!fs.existsSync(inputPath)) {
        console.error("❌ Input template file not found at:", inputPath);
        return;
      }
      const docxBuf = fs.readFileSync(inputPath);
      
      console.log("Converting docx to pdf via WASM...");
      const resultObj = await converter.convert(docxBuf, { outputFormat: 'pdf' });
      const pdfBuf = resultObj.data;
      console.log("✅ Conversion successful! PDF bytes generated:", pdfBuf.length);
      
      await converter.destroy();
    } catch (err) {
      console.error("❌ WASM conversion failed with error:");
      console.error(err);
    }
  });
}

runDiagnostics();
