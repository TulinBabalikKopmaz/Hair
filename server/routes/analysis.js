const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const router = express.Router();

const FACE_SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'face_orientation.py');

const runFaceOrientation = (imageBase64) =>
  new Promise((resolve, reject) => {
    const py = spawn('python3', [FACE_SCRIPT_PATH]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    py.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(
          new Error(
            stderr || `Python script exited with code ${code}`,
          ),
        );
      }
      try {
        const payload = JSON.parse(stdout);
        resolve(payload);
      } catch (error) {
        reject(new Error(`Python output parse error: ${error.message}`));
      }
    });

    py.on('error', (error) => {
      reject(error);
    });

    py.stdin.write(
      JSON.stringify({
        imageBase64,
      }),
    );
    py.stdin.end();
  });

router.post('/face-orientation', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        message: 'imageBase64 alanı gereklidir',
      });
    }

    const result = await runFaceOrientation(imageBase64);

    if (!result.success) {
      return res.status(422).json({
        message: result.message || 'Yüz yönü belirlenemedi',
        details: result,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Face orientation error:', error);
    res.status(500).json({
      message: 'Yüz yönü analizi başarısız oldu',
      error: error.message,
    });
  }
});

module.exports = router;

