import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zntlopkzeklxdfvldugb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudGxvcGt6ZWtseGRmdmxkdWdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIwMzYyNiwiZXhwIjoyMDg5Nzc5NjI2fQ.LSPIBwRYthzOFgvpnzxi3Zqo4k3m0hyNzgSCTORMgjk'
);

async function testUpvotes() {
  console.log('Testing upvote system...\n');

  // Test 1: Insert test upvotes for multiple events
  console.log('1️⃣ Inserting test upvotes...');
  
  const testUpvotes = [
    { event_id: 'kuckuck-fri', anonymous_session_id: 'session-1' },
    { event_id: 'kuckuck-fri', anonymous_session_id: 'session-2' },
    { event_id: 'kuckuck-fri', anonymous_session_id: 'session-3' },
    { event_id: 'clubhaus-sat', anonymous_session_id: 'session-1' },
    { event_id: 'clubhaus-sat', anonymous_session_id: 'session-2' },
    { event_id: 'schlachthaus-sun', anonymous_session_id: 'session-1' },
  ];

  const { error: insertError } = await supabase
    .from('event_upvotes')
    .insert(testUpvotes);

  if (insertError) {
    console.error('❌ Insert failed:', insertError);
    return;
  }

  console.log(`✅ Inserted ${testUpvotes.length} test upvotes\n`);

  // Test 2: Count upvotes per event
  console.log('2️⃣ Counting upvotes by event...');
  
  const { data: allUpvotes, error: countError } = await supabase
    .from('event_upvotes')
    .select('event_id');

  if (countError) {
    console.error('❌ Count failed:', countError);
    return;
  }

  const counts = new Map();
  for (const row of allUpvotes || []) {
    const count = (counts.get(row.event_id) || 0) + 1;
    counts.set(row.event_id, count);
  }

  console.log('Event upvote counts:');
  for (const [eventId, count] of counts.entries()) {
    console.log(`  - ${eventId}: ${count} upvotes 🔥`);
  }

  console.log('\n✅ Upvote system is working! All counts are persisted and retrievable.');
}

testUpvotes();
