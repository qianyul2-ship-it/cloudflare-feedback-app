-- Cloudflare D1 Database Schema for Feedback Dashboard
-- Run this SQL file after creating the database with: wrangler d1 execute feedback-db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS feedback (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	content TEXT NOT NULL,
	sentiment TEXT CHECK(sentiment IN ('Positive', 'Negative', 'Neutral')),
	category TEXT CHECK(category IN ('Bug', 'Feature Request', 'Pricing', 'UX/UI', 'Performance', 'Other')),
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on created_at for faster queries sorted by date
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Create an index on sentiment for filtering feedback by sentiment
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);

-- Create an index on category for filtering feedback by category
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
