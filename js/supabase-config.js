/* LinuxPath · configuración de Supabase.
   url      → "Project URL" del proyecto linuxpath
   anonKey  → clave "anon" (pública)
   La clave anon es pública por diseño: va en el navegador y la protegen las políticas RLS de supabase/schema.sql.
   NUNCA pongas aquí la clave "service_role": esa da acceso total a la base de datos. */
window.SUPABASE_CONFIG = {
  url: 'https://ydfqfnroxclzxquotfyt.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZnFmbnJveGNsenhxdW90Znl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM5MzAxMDAsImV4cCI6MjEwOTUwNjEwMH0.G6gv8dxWGUxcLqv_NqULEtPovuFOQbVVdPMF6QHUq3Y',
};
