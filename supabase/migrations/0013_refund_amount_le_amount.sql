ALTER TABLE expenses
  ADD CONSTRAINT expenses_refund_le_amount
    CHECK (refund_amount <= amount);
