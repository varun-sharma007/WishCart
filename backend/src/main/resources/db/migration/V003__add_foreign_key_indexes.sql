create index if not exists best_item_placements_price_range_idx on best_item_placements(price_range_id) where price_range_id is not null;
create index if not exists product_categories_category_idx on product_categories(category_id);
create index if not exists audit_logs_actor_idx on audit_logs(actor_id) where actor_id is not null;
