INSERT INTO categories (name, slug, description) VALUES
  ('Electronics', 'electronics', 'Electronic devices and accessories'),
  ('Clothing', 'clothing', 'Apparel and fashion items'),
  ('Books', 'books', 'Books and publications'),
  ('Home & Garden', 'home-garden', 'Home improvement and garden supplies'),
  ('Sports', 'sports', 'Sports equipment and gear');

INSERT INTO products (name, slug, description, price, stock, category_id) VALUES
  ('Wireless Headphones', 'wireless-headphones', 'Bluetooth 5.0 wireless headphones with noise cancellation', 79.99, 150, 1),
  ('USB-C Hub', 'usb-c-hub', '7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader', 34.99, 200, 1),
  ('Cotton T-Shirt', 'cotton-tshirt', 'Premium cotton t-shirt available in multiple colors', 24.99, 500, 2),
  ('Denim Jacket', 'denim-jacket', 'Classic denim jacket with modern fit', 89.99, 100, 2),
  ('JavaScript: The Good Parts', 'javascript-good-parts', 'Essential JavaScript programming book', 29.99, 75, 3),
  ('Clean Code', 'clean-code', 'Robert C. Martin guide to writing better code', 39.99, 60, 3),
  ('Indoor Plant Set', 'indoor-plant-set', 'Set of 3 low-maintenance indoor plants', 45.99, 80, 4),
  ('Yoga Mat', 'yoga-mat', 'Non-slip yoga mat with carrying strap', 19.99, 300, 5),
  ('Running Shoes', 'running-shoes', 'Lightweight running shoes with cushioned sole', 129.99, 120, 5),
  ('Smart Watch', 'smart-watch', 'Fitness tracker with heart rate monitor and GPS', 199.99, 90, 1);

INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES
  ('demo_user', 'demo@example.com', '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Ql5qLqFdYEMqJ0q3pZn3q3pZn3q', 'Demo', 'User'),
  ('admin', 'admin@example.com', '$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Ql5qLqFdYEMqJ0q3pZn3q3pZn3q', 'Admin', 'User');
