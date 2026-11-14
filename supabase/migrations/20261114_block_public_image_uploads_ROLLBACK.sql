/*
  ROLLBACK for 20261114_block_public_image_uploads.sql
  Restores the upload policy that was live on 2026-11-14.
  Note: this re-opens public uploads to the images bucket.
*/

CREATE POLICY "Anyone can upload images" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'images'::text);
