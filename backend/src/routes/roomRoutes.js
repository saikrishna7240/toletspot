
const express = require("express");
const pool = require("../config/db");

const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// UUID validation
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

// =====================================================
// CONTROLLER: CREATE ROOM
// OWNER ONLY
// =====================================================

const createRoom = async (req, res) => {
  try {
    const {
      title,
      description,
      room_type,
      monthly_rent,
      security_deposit,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      available_from,
    } = req.body;

    if (
      !title?.trim() ||
      !room_type ||
      monthly_rent === undefined ||
      monthly_rent === null ||
      monthly_rent === "" ||
      !address?.trim() ||
      !city?.trim() ||
      !state?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, room type, rent, address, city and state are required",
      });
    }

    const rent = Number(monthly_rent);
    const deposit =
      security_deposit === undefined || security_deposit === ""
        ? 0
        : Number(security_deposit);

    if (
      !Number.isFinite(rent) ||
      rent <= 0 ||
      !Number.isFinite(deposit) ||
      deposit < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Rent must be positive and deposit cannot be negative",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO rooms (
        owner_id,
        title,
        description,
        room_type,
        monthly_rent,
        security_deposit,
        address,
        city,
        state,
        pincode,
        latitude,
        longitude,
        available_from,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, 'PENDING'
      )
      RETURNING *
      `,
      [
        req.user.id,
        title.trim(),
        description?.trim() || null,
        room_type,
        rent,
        deposit,
        address.trim(),
        city.trim(),
        state.trim(),
        pincode || null,
        latitude ?? null,
        longitude ?? null,
        available_from || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "Room submitted successfully and is awaiting admin approval",
      room: result.rows[0],
    });
  } catch (error) {
    console.error("Create room error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
};

// =====================================================
// CONTROLLER: EDIT ROOM
// OWNER ONLY
// PUT /api/rooms/:id
// =====================================================

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    const {
      title,
      description,
      room_type,
      monthly_rent,
      security_deposit,
      address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      available_from,
    } = req.body;

    if (
      !title?.trim() ||
      !room_type ||
      monthly_rent === undefined ||
      monthly_rent === null ||
      monthly_rent === "" ||
      !address?.trim() ||
      !city?.trim() ||
      !state?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Title, room type, rent, address, city and state are required",
      });
    }

    const rent = Number(monthly_rent);
    const deposit =
      security_deposit === undefined || security_deposit === ""
        ? 0
        : Number(security_deposit);

    if (
      !Number.isFinite(rent) ||
      rent <= 0 ||
      !Number.isFinite(deposit) ||
      deposit < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Rent must be positive and deposit cannot be negative",
      });
    }

    // Only the owning user may edit a pending/rejected room.
    // A rejected room is resubmitted for approval after editing.
    const result = await pool.query(
      `
      UPDATE rooms
      SET
        title = $1,
        description = $2,
        room_type = $3,
        monthly_rent = $4,
        security_deposit = $5,
        address = $6,
        city = $7,
        state = $8,
        pincode = $9,
        latitude = $10,
        longitude = $11,
        available_from = $12,
        status = 'PENDING',
        rejection_reason = NULL,
        updated_at = NOW()
      WHERE id = $13
        AND owner_id = $14
        AND status IN ('PENDING', 'REJECTED')
      RETURNING *
      `,
      [
        title.trim(),
        description?.trim() || null,
        room_type,
        rent,
        deposit,
        address.trim(),
        city.trim(),
        state.trim(),
        pincode || null,
        latitude ?? null,
        longitude ?? null,
        available_from || null,
        id,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Room not found, not owned by you, or cannot be edited in its current status",
      });
    }

    return res.json({
      success: true,
      message: "Room updated and submitted for admin approval",
      room: result.rows[0],
    });
  } catch (error) {
    console.error("Update room error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update room",
    });
  }
};

// =====================================================
// CONTROLLER: GET OWNER'S ROOMS
// OWNER ONLY
// =====================================================

const getMyRooms = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        title,
        description,
        room_type,
        monthly_rent,
        security_deposit,
        address,
        city,
        state,
        available_from,
        status,
        rejection_reason,
        created_at,
        updated_at
      FROM rooms
      WHERE owner_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    return res.json({
      success: true,
      count: result.rows.length,
      rooms: result.rows,
    });
  } catch (error) {
    console.error("Get owner rooms error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
    });
  }
};

// =====================================================
// CONTROLLER: GET APPROVED ROOMS
// PUBLIC
// =====================================================

const getApprovedRooms = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.title,
        r.description,
        r.room_type,
        r.monthly_rent,
        r.security_deposit,
        r.address,
        r.city,
        r.state,
        r.pincode,
        r.available_from,
        r.created_at,
        u.name AS owner_name
      FROM rooms r
      JOIN users u ON r.owner_id = u.id
      WHERE r.status = 'APPROVED'
      ORDER BY r.created_at DESC
      `
    );

    return res.json({
      success: true,
      count: result.rows.length,
      rooms: result.rows,
    });
  } catch (error) {
    console.error("Get approved rooms error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
    });
  }
};

// =====================================================
// CONTROLLER: GET ROOM BY ID
// PUBLIC — APPROVED ROOMS ONLY
// =====================================================

const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID",
      });
    }

    const result = await pool.query(
      `
      SELECT
        r.*,
        u.name AS owner_name,
        u.phone AS owner_phone
      FROM rooms r
      JOIN users u ON r.owner_id = u.id
      WHERE r.id = $1
        AND r.status = 'APPROVED'
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.json({
      success: true,
      room: result.rows[0],
    });
  } catch (error) {
    console.error("Get room error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch room",
    });
  }
};

// =====================================================
// ROUTES
// Keep specific routes before /:id
// =====================================================

// Owner creates a room
router.post(
  "/",
  authenticate,
  authorize("OWNER"),
  createRoom
);

// Owner views their rooms
router.get(
  "/my",
  authenticate,
  authorize("OWNER"),
  getMyRooms
);

// Owner edits a room
router.put(
  "/:id",
  authenticate,
  authorize("OWNER"),
  updateRoom
);

// Anyone can see approved rooms
router.get("/", getApprovedRooms);

// Anyone can view an approved room
router.get("/:id", getRoomById);

module.exports = router;
