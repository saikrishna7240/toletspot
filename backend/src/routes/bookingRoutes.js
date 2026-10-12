
const express = require("express");
const pool = require("../config/db");

const {
  authenticate,
  authorize,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ============================================
// TENANT: REQUEST A BOOKING
// ============================================
const createBooking = async (req, res) => {
  const { roomId } = req.body;

  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: "Room ID is required",
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Lock the room to serialize booking requests.
    const roomResult = await client.query(
      `SELECT id, owner_id, title, status
       FROM rooms
       WHERE id = $1
       FOR UPDATE`,
      [roomId]
    );

    if (
      !roomResult.rows.length ||
      roomResult.rows[0].status !== "APPROVED"
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Approved room not found",
      });
    }

    const room = roomResult.rows[0];

    if (room.owner_id === req.user.id) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "You cannot book your own room",
      });
    }

    // Prevent booking an already-booked room.
    const acceptedBooking = await client.query(
      `SELECT id
       FROM bookings
       WHERE room_id = $1
         AND status = 'ACCEPTED'
       LIMIT 1`,
      [roomId]
    );

    if (acceptedBooking.rows.length) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "This room has already been booked",
      });
    }

    // Prevent duplicate pending requests from the same tenant.
    const existing = await client.query(
      `SELECT id
       FROM bookings
       WHERE room_id = $1
         AND tenant_id = $2
         AND status = 'PENDING'`,
      [roomId, req.user.id]
    );

    if (existing.rows.length) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "You already have a pending request for this room",
      });
    }

    const result = await client.query(
      `INSERT INTO bookings (room_id, tenant_id)
       VALUES ($1, $2)
       RETURNING *`,
      [roomId, req.user.id]
    );

    // Notify owner in the same transaction.
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, $2, $3)`,
      [
        room.owner_id,
        "New booking request",
        `A tenant has requested to book "${room.title}".`,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Booking request sent to the owner",
      booking: result.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Create booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create booking request",
    });
  } finally {
    if (client) client.release();
  }
};

// ============================================
// TENANT: VIEW MY BOOKINGS
// ============================================
const getMyBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         b.id,
         b.status,
         b.requested_at,
         b.updated_at,
         r.id AS room_id,
         r.title,
         r.city,
         r.monthly_rent,
         u.name AS owner_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = r.owner_id
       WHERE b.tenant_id = $1
       ORDER BY b.requested_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      bookings: result.rows,
    });
  } catch (error) {
    console.error("Get tenant bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};

// ============================================
// OWNER: VIEW REQUESTS FOR MY ROOMS
// ============================================
const getOwnerBookings = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         b.id AS booking_id,
         b.status,
         b.requested_at,
         b.updated_at,
         r.id AS room_id,
         r.title,
         r.monthly_rent,
         u.name AS tenant_name,
         u.email AS tenant_email
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN users u ON u.id = b.tenant_id
       WHERE r.owner_id = $1
       ORDER BY b.requested_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      bookings: result.rows,
    });
  } catch (error) {
    console.error("Get owner bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking requests",
    });
  }
};

// ============================================
// OWNER: ACCEPT OR REJECT A BOOKING
// ============================================
const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["ACCEPTED", "REJECTED"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be ACCEPTED or REJECTED",
    });
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    // Lock the booking and retrieve its room.
    const result = await client.query(
      `SELECT
         b.id,
         b.status,
         b.room_id,
         b.tenant_id,
         r.owner_id,
         r.title,
         r.status AS room_status
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE b.id = $1
       FOR UPDATE OF b`,
      [id]
    );

    if (
      !result.rows.length ||
      result.rows[0].owner_id !== req.user.id
    ) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Booking request not found",
      });
    }

    const booking = result.rows[0];

    if (booking.status !== "PENDING") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "This booking request has already been processed",
      });
    }

    if (
      status === "ACCEPTED" &&
      booking.room_status !== "APPROVED"
    ) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "This room is no longer available for booking",
      });
    }

    if (status === "ACCEPTED") {
      // Serialize acceptance attempts for this room.
      await client.query(
        `SELECT id FROM rooms WHERE id = $1 FOR UPDATE`,
        [booking.room_id]
      );

      const accepted = await client.query(
        `SELECT id
         FROM bookings
         WHERE room_id = $1
           AND status = 'ACCEPTED'
         LIMIT 1`,
        [booking.room_id]
      );

      if (accepted.rows.length) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message: "Another booking has already been accepted",
        });
      }
    }

    const updated = await client.query(
      `UPDATE bookings
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    // Notify tenant in the same transaction.
    await client.query(
      `INSERT INTO notifications (user_id, title, message)
       VALUES ($1, $2, $3)`,
      [
        booking.tenant_id,
        `Booking ${status.toLowerCase()}`,
        `Your request for "${booking.title}" has been ${status.toLowerCase()}.`,
      ]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Booking ${status.toLowerCase()} successfully`,
      booking: updated.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    // PostgreSQL unique-index violation, if the
    // database safeguard has also been installed.
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This room already has an accepted booking",
      });
    }

    console.error("Update booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update booking",
    });
  } finally {
    if (client) client.release();
  }
};

// ============================================
// ROUTES
// ============================================
router.post(
  "/",
  authenticate,
  authorize("TENANT"),
  createBooking
);

router.get(
  "/my",
  authenticate,
  authorize("TENANT"),
  getMyBookings
);

router.get(
  "/owner",
  authenticate,
  authorize("OWNER"),
  getOwnerBookings
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("OWNER"),
  updateBookingStatus
);


router.patch("/:id/cancel", authenticate, authorize("TENANT"), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE bookings
       SET status = 'CANCELLED',
           updated_at = NOW()
       WHERE id = $1
         AND tenant_id = $2
         AND status = 'PENDING'
       RETURNING id, status`,
      [id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Booking not found, or it is no longer pending.",
      });
    }

    return res.json({
      success: true,
      message: "Booking request cancelled successfully.",
      booking: result.rows[0],
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel booking.",
    });
  }
});

module.exports = router;
