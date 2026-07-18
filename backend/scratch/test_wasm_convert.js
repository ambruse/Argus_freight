const lib = require('@matbee/libreoffice-converter');
const wasmLoader = require('@matbee/libreoffice-converter/wasm/loader');
const fs = require('fs');
const path = require('path');

async function testWasm() {
  try {
    console.log("Initializing LibreOfficeConverter with WASM loader...");
    const converter = await lib.createConverter({ wasmLoader });
    console.log("Converter initialized successfully!");
    
    const inputPath = path.join(__dirname, '../../public/Argus_Ambient_Premium_Quotation.docx');
    const docxBuf = fs.readFileSync(inputPath);
    
    console.log("Converting...");
    const resultObj = await converter.convert(docxBuf, { outputFormat: 'pdf' });
    const pdfBuf = resultObj.data;
    console.log("Conversion successful! PDF bytes:", pdfBuf.length);
    
    const outputPath = path.join(__dirname, '../../public/test_wasm_output.pdf');
    fs.writeFileSync(outputPath, pdfBuf);
    console.log("Saved converted PDF to:", outputPath);
    
    await converter.destroy();
  } catch (err) {
    console.error("WASM conversion failed:", err);
  }
}
testWasm();
