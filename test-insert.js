import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zntlopkzeklxdfvldugb.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudGxvcGt6ZWtseGRmdmxkdWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDM2MjYsImV4cCI6MjA4OTc3OTYyNn0.3wP67SdwdHYXUEo5IQ25c4M1EjFnd3rN3qw1sG5i7AY";

async function testInsert() {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  console.log("Testing INSERT with anonymous user...");

  const testData = {
    user_id: null, // anonymous
    submitter_name: "Test User",
    title: "Test Hangout",
    description: "This is a test hangout",
    location_text: "Berlin",
    meetup_at: new Date().toISOString(),
    review_status: "pending",
    status: "pending",
    is_published: false,
  };

  console.log("Inserting:", JSON.stringify(testData, null, 2));

  const { data, error } = await supabase
    .from("hangouts")
    .insert([testData])
    .select();

  if (error) {
    console.error("❌ Insert failed:");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Details:", error.details);
    console.error("Hint:", error.hint);
    return { success: false, error };
  }

  console.log("✅ Insert successful:");
  console.log(JSON.stringify(data, null, 2));
  return { success: true, data };
}

testInsert().then((result) => {
  process.exit(result.success ? 0 : 1);
});
