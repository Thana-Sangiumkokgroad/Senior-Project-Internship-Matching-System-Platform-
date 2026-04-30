const multer = require('multer');

// Configure multer to store files in memory as buffers
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept image files for profile_image
  if (file.fieldname === 'profile_image') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Profile image must be an image file'), false);
    }
  }
  // Accept PDF and Word documents for resume and transcript
  else if (file.fieldname === 'resume_cv_file' || file.fieldname === 'transcript_file') {
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Resume and transcript must be PDF or Word documents'), false);
    }
  }
  // Accept image and PDF files for company_logo
  else if (file.fieldname === 'company_logo') {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Company logo must be an image file'), false);
    }
  }
  else {
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB per file
    fieldSize: 15 * 1024 * 1024  // 15MB per text field (for base64 images in JSON)
  }
});

module.exports = upload;
