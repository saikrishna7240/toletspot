const express = require("express");

const pool = require("../config/db");

const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();


// =====================================================
// GET PENDING ROOMS
// ADMIN ONLY
// =====================================================

const getPendingRooms = async (req, res) => {
  try {
    const result = await pool.query(`
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
        r.status,
        r.created_at,

        u.id AS owner_id,
        u.name AS owner_name,
        u.email AS owner_email,
        u.phone AS owner_phone

      FROM rooms r

      JOIN users u
        ON r.owner_id = u.id

      WHERE r.status = 'PENDING'

      ORDER BY r.created_at ASC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      rooms: result.rows,
    });

  } catch (error) {
    console.error("Get pending rooms error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch pending rooms",
    });
  }
};


// =====================================================
// APPROVE ROOM
// ADMIN ONLY
// =====================================================

const approveRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Check room
      const roomResult = await client.query(
        `
        SELECT id, status
        FROM rooms
        WHERE id = $1
        `,
        [id]
      );

      if (roomResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      const room = roomResult.rows[0];

      if (room.status !== "PENDING") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: `Room is already ${room.status}`,
        });
      }

      // Approve room
      const updateResult = await client.query(
        `
        UPDATE rooms
        SET
          status = 'APPROVED',
          rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      // Record approval
      await client.query(
        `
        INSERT INTO room_approvals
        (room_id, admin_id, action)
        VALUES ($1, $2, 'APPROVED')
        `,
        [id, req.user.id]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Room approved successfully",
        room: updateResult.rows[0],
      });

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Approve room error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to approve room",
    });
  }
};


// =====================================================
// REJECT ROOM
// ADMIN ONLY
// =====================================================

const rejectRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const roomResult = await client.query(
        `
        SELECT id, status
        FROM rooms
        WHERE id = $1
        `,
        [id]
      );

      if (roomResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      if (roomResult.rows[0].status !== "PENDING") {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Only pending rooms can be rejected",
        });
      }

      const updateResult = await client.query(
        `
        UPDATE rooms
        SET
          status = 'REJECTED',
          rejection_reason = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
        `,
        [reason.trim(), id]
      );

      await client.query(
        `
        INSERT INTO room_approvals
        (room_id, admin_id, action, reason)
        VALUES ($1, $2, 'REJECTED', $3)
        `,
        [id, req.user.id, reason.trim()]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Room rejected",
        room: updateResult.rows[0],
      });

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Reject room error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to reject room",
    });
  }
};


// =====================================================
// DELETE ROOM
// ADMIN ONLY
// =====================================================

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const roomResult = await client.query(
        `
        SELECT id, status
        FROM rooms
        WHERE id = $1
        `,
        [id]
      );

      if (roomResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Room not found",
        });
      }

      await client.query(
        `
        UPDATE rooms
        SET
          status = 'DELETED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [id]
      );

      await client.query(
        `
        INSERT INTO room_approvals
        (room_id, admin_id, action)
        VALUES ($1, $2, 'DELETED')
        `,
        [id, req.user.id]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Room deleted successfully",
      });

    } catch (error) {
      await client.query("ROLLBACK");
      throw error;

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("Delete room error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete room",
    });
  }
};


// =====================================================
// ROUTES
// =====================================================

router.get(
  "/rooms/pending",
  authenticate,
  authorize("ADMIN"),
  getPendingRooms
);

router.put(
  "/rooms/:id/approve",
  authenticate,
  authorize("ADMIN"),
  approveRoom
);

router.put(
  "/rooms/:id/reject",
  authenticate,
  authorize("ADMIN"),
  rejectRoom
);

router.delete(
  "/rooms/:id",
  authenticate,
  authorize("ADMIN"),
  deleteRoom
);


module.exports = router;