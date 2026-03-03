-- Migration 06: Add is_virtual boolean column to courses

ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN NOT NULL DEFAULT FALSE;
