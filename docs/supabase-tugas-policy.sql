-- ============================================================
-- TUMARA — Bucket & Policy untuk fitur Tugas Kelas
-- Jalankan SEKALI di Supabase Dashboard → SQL Editor → New query → Run.
--
-- Membuat 2 bucket publik + policy anon (baca/unggah/hapus), mengikuti pola
-- yang sama dengan bucket 'jurnal-foto' & 'jadwal-foto' yang sudah ada.
--   tugas-lampiran → lampiran FOTO dari guru (soal/instruksi)
--   tugas-jawaban  → pengumpulan siswa (FOTO atau PDF)
--
-- Catatan keamanan: sama seperti bucket foto yang lama — bucket publik berarti
-- siapa pun yang tahu URL file bisa membacanya, dan role anon boleh unggah/hapus.
-- Untuk sekolah ini dianggap dapat diterima. Bila kelak ingin lebih ketat,
-- pindah ke Supabase third-party auth (Firebase) lalu ganti `to anon` → `to authenticated`.
-- ============================================================

-- 1) Buat bucket (idempotent — aman dijalankan ulang)
insert into storage.buckets (id, name, public)
values
  ('tugas-lampiran', 'tugas-lampiran', true),
  ('tugas-jawaban',  'tugas-jawaban',  true)
on conflict (id) do update set public = true;

-- 2) Policy bucket 'tugas-lampiran' (foto lampiran dari guru)
create policy "tumara_tglampiran_baca"
  on storage.objects for select to anon using (bucket_id = 'tugas-lampiran');
create policy "tumara_tglampiran_unggah"
  on storage.objects for insert to anon with check (bucket_id = 'tugas-lampiran');
create policy "tumara_tglampiran_hapus"
  on storage.objects for delete to anon using (bucket_id = 'tugas-lampiran');

-- 3) Policy bucket 'tugas-jawaban' (pengumpulan foto/PDF dari siswa)
create policy "tumara_tgjawaban_baca"
  on storage.objects for select to anon using (bucket_id = 'tugas-jawaban');
create policy "tumara_tgjawaban_unggah"
  on storage.objects for insert to anon with check (bucket_id = 'tugas-jawaban');
create policy "tumara_tgjawaban_hapus"
  on storage.objects for delete to anon using (bucket_id = 'tugas-jawaban');
