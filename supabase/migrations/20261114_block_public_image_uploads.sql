/*
  Security fix: stop anyone from uploading files to the images bucket.

  Before:
  - Policy "Anyone can upload images" let any visitor, logged in or not,
    upload any file of any size and type to the public images bucket.
    That allows hosting spam/phishing/malware under the project's storage URL
    and filling the storage quota.

  After:
  - No upload policy for visitors or customers. The website never uploads
    files. Dish photos are uploaded through the Supabase dashboard, which
    uses admin access and is not affected by this policy.
  - The bucket stays public, so existing dish photos still load.

  Rollback: 20261114_block_public_image_uploads_ROLLBACK.sql
*/

DROP POLICY IF EXISTS "Anyone can upload images" ON storage.objects;
