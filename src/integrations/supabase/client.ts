// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://duvxgbgnqrjriqefpbhn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dnhnYmducXJqcmlxZWZwYmhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NzMwNDYsImV4cCI6MjA1NzA0OTA0Nn0.lD0pGYsjzopvJFw3NvDrhL6qTOS0cGPSWzozXksMrjQ";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);