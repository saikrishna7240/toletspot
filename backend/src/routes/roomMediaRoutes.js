const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const pool = require("../config/db");

const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 10,
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const valid =
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/");

    callback(
      valid ? null : new Error("Only image and video files are allowed"),
      valid
    );
  },
});

function uploadBufferToCloudinary(file, roomId) {
  const resourceType = file.mimetype.startsWith("video/")
    ? "video"
    : "image";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `toletspot/rooms/${roomId}`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          ...result,
          mediaType: resourceType === "video" ? "VIDEO" : "IMAGE",
        });
      }
    );

    stream.end(file.buffer);
  });
}

function handleUploadError(error, _req, res, next) {
  if (!error) return next();

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each file must be 100 MB or smaller"
        : "Upload up to 10 files at a time";

    return res.status(400).json({
      success: false,
      message,
    });
  }

  return res.status(400).json({
    success: false,
    message: error.message || "Invalid media upload",
  });
}

// Add an image URL (existing functionality)
const addRoomImage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { image_url, is_primary = false } = req.body;

    if (
      typeof image_url !== "string" ||
      !/^https?:\/\/\S+$/i.test(image_url)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid image URL is required",
      });
    }

    const room = await pool.query(
      `SELECT id FROM rooms
       WHERE id = $1 AND owner_id = $2
       AND status IN ('PENDING', 'REJECTED')`,
      [roomId, req.user.id]
    );

    if (!room.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Room not found or cannot be edited",
      });
    }

    const result = await pool.query(
      `INSERT INTO room_images (room_id, image_url, is_primary)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [roomId, image_url, is_primary]
    );

    return res.status(201).json({
      success: true,
      image: result.rows[0],
    });
  } catch (error) {
    console.error("Add image error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add room image",
    });
  }
};

// Upload multiple image/video files
const addRoomMedia = async (req, res) => {
  const client = await pool.connect();
  const uploadedFiles = [];

  try {
    const { roomId } = req.params;
    const files = req.files || [];

    if (!files.length) {
      client.release();

      return res.status(400).json({
        success: false,
        message: "Select at least one image or video",
      });
    }

    const room = await client.query(
      `SELECT id FROM rooms
       WHERE id = $1 AND owner_id = $2
       AND status IN ('PENDING', 'REJECTED')`,
      [roomId, req.user.id]
    );

    if (!room.rows.length) {
      client.release();

      return res.status(404).json({
        success: false,
        message: "Room not found or cannot be edited",
      });
    }

    // Upload files to cloud storage first.
    for (const file of files) {
      const uploaded = await uploadBufferToCloudinary(file, roomId);
      uploadedFiles.push(uploaded);
    }

    await client.query("BEGIN");

    const savedMedia = [];

    for (const uploaded of uploadedFiles) {
      const result = await client.query(
        `INSERT INTO room_media
          (room_id, media_url, media_type, public_id, is_primary)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, room_id, media_url, media_type,
                   is_primary, created_at`,
        [
          roomId,
          uploaded.secure_url,
          uploaded.mediaType,
          uploaded.public_id,
          savedMedia.length === 0 && uploaded.mediaType === "IMAGE",
        ]
      );

      savedMedia.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Property media uploaded successfully",
      media: savedMedia,
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Media rollback error:", rollbackError);
    }

    console.error("Upload room media error:", error);

    // Remove files from cloud storage if the database save failed.
    for (const uploaded of uploadedFiles) {
      try {
        await cloudinary.uploader.destroy(uploaded.public_id, {
          resource_type:
            uploaded.mediaType === "VIDEO" ? "video" : "image",
        });
      } catch (cleanupError) {
        console.error("Cloudinary cleanup error:", cleanupError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to upload property media",
    });
  } finally {
    client.release();
  }
};

// Public endpoint for a room's gallery
const getRoomMedia = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, room_id, media_url, media_type, is_primary, created_at
       FROM room_media
       WHERE room_id = $1
       ORDER BY is_primary DESC, created_at ASC`,
      [req.params.roomId]
    );

    return res.json({
      success: true,
      media: result.rows,
    });
  } catch (error) {
    console.error("Get room media error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load property media",
    });
  }
};

// Update room amenities (existing functionality)
const setRoomAmenities = async (req, res) => {
  const client = await pool.connect();

  try {
    const { roomId } = req.params;
    const { amenities } = req.body;

    if (
      !Array.isArray(amenities) ||
      !amenities.every(
        (name) => typeof name === "string" && name.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Amenities must be an array of names",
      });
    }

    await client.query("BEGIN");

    const room = await client.query(
      `SELECT id FROM rooms
       WHERE id = $1 AND owner_id = $2
       AND status IN ('PENDING', 'REJECTED')
       FOR UPDATE`,
      [roomId, req.user.id]
    );

    if (!room.rows.length) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Room not found or cannot be edited",
      });
    }

    await client.query(
      "DELETE FROM room_amenities WHERE room_id = $1",
      [roomId]
    );

    const uniqueAmenities = [
      ...new Set(amenities.map((name) => name.trim())),
    ];

    for (const name of uniqueAmenities) {
      const amenity = await client.query(
        "SELECT id FROM amenities WHERE name = $1",
        [name]
      );

      if (!amenity.rows.length) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Unknown amenity: ${name}`,
        });
      }

      await client.query(
        `INSERT INTO room_amenities (room_id, amenity_id)
         VALUES ($1, $2)`,
        [roomId, amenity.rows[0].id]
      );
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Room amenities updated",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Set amenities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update amenities",
    });
  } finally {
    client.release();
  }
};

router.get("/:roomId/media", getRoomMedia);

router.post(
  "/:roomId/images",
  authenticate,
  authorize("OWNER"),
  addRoomImage
);

router.post(
  "/:roomId/media",
  authenticate,
  authorize("OWNER"),
  upload.array("media", 10),
  handleUploadError,
  addRoomMedia
);

router.put(
  "/:roomId/amenities",
  authenticate,
  authorize("OWNER"),
  setRoomAmenities
);

module.exports = router;