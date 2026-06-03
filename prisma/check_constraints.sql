-- Constraints Prisma cannot express natively.
-- Run after `prisma migrate dev` (or paste into the generated migration file).

-- Reviews: rating must be 1..5
ALTER TABLE reviews
  ADD CONSTRAINT reviews_rating_range_chk
  CHECK (rating BETWEEN 1 AND 5);

-- Order amounts: cents must be non-negative
ALTER TABLE orders
  ADD CONSTRAINT orders_total_nonneg_chk     CHECK (total_amount    >= 0),
  ADD CONSTRAINT orders_shipping_nonneg_chk  CHECK (shipping_amount >= 0);

ALTER TABLE order_items
  ADD CONSTRAINT order_items_quantity_pos_chk    CHECK (quantity        >  0),
  ADD CONSTRAINT order_items_unit_nonneg_chk     CHECK (unit_amount     >= 0),
  ADD CONSTRAINT order_items_payout_nonneg_chk   CHECK (seller_payout   >= 0),
  ADD CONSTRAINT order_items_refunded_nonneg_chk CHECK (refunded_amount >= 0),
  ADD CONSTRAINT order_items_refund_le_total_chk
    CHECK (refunded_amount <= unit_amount * quantity);

-- Listings: stock and price sanity
ALTER TABLE listings
  ADD CONSTRAINT listings_price_pos_chk  CHECK (price_amount > 0),
  ADD CONSTRAINT listings_stock_nonneg_chk CHECK (stock >= 0);
