CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  dietary_restrictions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fridge items
CREATE TABLE fridge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  quantity NUMERIC,
  unit TEXT,
  typical_shelf_life_days INT,
  purchase_date TIMESTAMP NOT NULL,
  estimated_expiry TIMESTAMP,
  status TEXT DEFAULT 'fresh',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spoilage predictions
CREATE TABLE spoilage_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID UNIQUE NOT NULL REFERENCES fridge_items(id) ON DELETE CASCADE,
  risk_level TEXT,
  days_until_expiry INT,
  spoilage_probability_percent INT,
  confidence_score NUMERIC,
  reasoning TEXT,
  predicted_at TIMESTAMP DEFAULT NOW()
);

-- Barcode lookup cache
CREATE TABLE barcode_cache (
  barcode TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  typical_shelf_life_days INT NOT NULL,
  last_identified_at TIMESTAMP DEFAULT NOW()
);

-- Recipe suggestions
CREATE TABLE recipe_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  instructions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  difficulty TEXT,
  prep_time_minutes INT,
  reasoning TEXT,
  cooked BOOLEAN DEFAULT FALSE,
  saved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_fridge_items_user ON fridge_items(user_id);
CREATE INDEX idx_fridge_items_status ON fridge_items(status);
CREATE INDEX idx_fridge_items_estimated_expiry ON fridge_items(estimated_expiry);
CREATE INDEX idx_spoilage_user ON spoilage_predictions(user_id);
CREATE INDEX idx_spoilage_risk_level ON spoilage_predictions(risk_level);
CREATE INDEX idx_recipe_suggestions_user ON recipe_suggestions(user_id);

-- Enable row-level security for Supabase auth
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fridge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE spoilage_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can create their own profile"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can view their own fridge items"
ON fridge_items
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own fridge items"
ON fridge_items
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own fridge items"
ON fridge_items
FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own fridge items"
ON fridge_items
FOR DELETE
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own spoilage predictions"
ON spoilage_predictions
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own spoilage predictions"
ON spoilage_predictions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own spoilage predictions"
ON spoilage_predictions
FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own spoilage predictions"
ON spoilage_predictions
FOR DELETE
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own recipe suggestions"
ON recipe_suggestions
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own recipe suggestions"
ON recipe_suggestions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own recipe suggestions"
ON recipe_suggestions
FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own recipe suggestions"
ON recipe_suggestions
FOR DELETE
TO authenticated
USING (
  user_id IN (
    SELECT id
    FROM users
    WHERE auth_user_id = auth.uid()
  )
);