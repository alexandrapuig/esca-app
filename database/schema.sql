-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fridge items
CREATE TABLE fridge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  purchase_date TIMESTAMP NOT NULL,
  estimated_expiry TIMESTAMP,
  status TEXT DEFAULT 'fresh',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spoilage predictions
CREATE TABLE spoilage_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES fridge_items(id) ON DELETE CASCADE,
  risk_level TEXT,
  days_until_expiry INT,
  reasoning TEXT,
  predicted_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_fridge_items_user ON fridge_items(user_id);
CREATE INDEX idx_spoilage_user ON spoilage_predictions(user_id);