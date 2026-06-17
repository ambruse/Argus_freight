// src/routes/files.js
const express = require('express');
const router  = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { uploadFile, getFilesByRef, downloadFile, deleteFile } = require('../controllers/fileController');

router.use(authenticateToken);

// Upload a PDF for a specific shipment
router.post('/:ref_no',           upload.single('file'), uploadFile);

// List files for a shipment
router.get('/:ref_no',            getFilesByRef);

// Serve/stream file inline (for browser viewing)
router.get('/download/:id',       downloadFile);

// Delete a file
router.delete('/:id',             deleteFile);

module.exports = router;
