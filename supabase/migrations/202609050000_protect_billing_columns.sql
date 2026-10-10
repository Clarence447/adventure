-- RLS controls rows, not columns. Owners must not self-assign billing state.
revoke insert, update on public.businesses from authenticated;
grant insert (owner_user_id, name, phone_number, services, service_area,
  calendly_booking_link, google_review_link) on public.businesses to authenticated;
grant update (owner_user_id, name, phone_number, services, service_area,
  calendly_booking_link, google_review_link) on public.businesses to authenticated;
