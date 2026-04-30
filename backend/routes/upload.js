const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads', 'user-uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB
  }
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo recebido.' });
    }

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: `/uploads/user-uploads/${req.file.filename}`
    });
  } catch (err) {
    console.error('[UPLOAD][ERROR]', err);
    res.status(500).json({ error: 'Erro ao processar upload', details: err.message });
  }
});

module.exports = router;
