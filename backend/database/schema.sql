-- =========================================
-- ToLetSpot Database Schema
-- =========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- USERS
-- =========================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    email VARCHAR(150) UNIQUE NOT NULL,

    phone VARCHAR(20) UNIQUE,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL DEFAULT 'TENANT'
        CHECK (role IN ('TENANT', 'OWNER', 'ADMIN')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- ROOMS
-- =========================================

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL,

    title VARCHAR(200) NOT NULL,

    description TEXT,

    room_type VARCHAR(50) NOT NULL,

    monthly_rent NUMERIC(10,2) NOT NULL,

    security_deposit NUMERIC(10,2) DEFAULT 0,

    address TEXT NOT NULL,

    city VARCHAR(100) NOT NULL,

    state VARCHAR(100) NOT NULL,

    pincode VARCHAR(10),

    latitude NUMERIC(10,7),

    longitude NUMERIC(10,7),

    available_from DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'APPROVED',
                'REJECTED',
                'DELETED'
            )
        ),

    rejection_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_room_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================================
-- ROOM IMAGES
-- =========================================

CREATE TABLE room_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    room_id UUID NOT NULL,

    image_url TEXT NOT NULL,

    is_primary BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_image_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE
);


-- =========================================
-- AMENITIES
-- =========================================

CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) UNIQUE NOT NULL
);


-- =========================================
-- ROOM AMENITIES
-- =========================================

CREATE TABLE room_amenities (
    room_id UUID NOT NULL,

    amenity_id UUID NOT NULL,

    PRIMARY KEY (room_id, amenity_id),

    FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE,

    FOREIGN KEY (amenity_id)
        REFERENCES amenities(id)
        ON DELETE CASCADE
);


-- =========================================
-- ROOM APPROVALS
-- =========================================

CREATE TABLE room_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    room_id UUID NOT NULL,

    admin_id UUID NOT NULL,

    action VARCHAR(20) NOT NULL
        CHECK (
            action IN (
                'APPROVED',
                'REJECTED',
                'DELETED'
            )
        ),

    reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE,

    FOREIGN KEY (admin_id)
        REFERENCES users(id)
);


-- =========================================
-- BOOKINGS
-- =========================================

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    room_id UUID NOT NULL,

    tenant_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (
            status IN (
                'PENDING',
                'ACCEPTED',
                'REJECTED',
                'CANCELLED'
            )
        ),

    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE,

    FOREIGN KEY (tenant_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================================
-- FAVORITES
-- =========================================

CREATE TABLE favorites (
    user_id UUID NOT NULL,

    room_id UUID NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, room_id),

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE
);


-- =========================================
-- NOTIFICATIONS
-- =========================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    title VARCHAR(200) NOT NULL,

    message TEXT NOT NULL,

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX idx_rooms_owner
ON rooms(owner_id);

CREATE INDEX idx_rooms_status
ON rooms(status);

CREATE INDEX idx_rooms_city
ON rooms(city);

CREATE INDEX idx_rooms_rent
ON rooms(monthly_rent);

CREATE INDEX idx_bookings_room
ON bookings(room_id);

CREATE INDEX idx_bookings_tenant
ON bookings(tenant_id);

CREATE INDEX idx_notifications_user
ON notifications(user_id);