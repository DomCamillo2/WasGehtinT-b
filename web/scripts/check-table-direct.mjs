import pg from 'pg';

const { Client } = pg;

// Supabase connection details (using the public API endpoint)
const client = new Client({
  host: 'zntlopkzeklxdfvldugb.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres.zntlopkzeklxdfvldugb',
  password: 'Tuebingen2025!',
  ssl: {
    rejectUnauthorized: false,
  },
});

async function checkTable() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase database\n');

    // Check if event_upvotes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'event_upvotes'
      ) as exists;
    `);

    const tableExists = tableCheck.rows[0].exists;
    console.log(`Table exists: ${tableExists ? '✅' : '❌'}\n`);

    if (tableExists) {
      // Get table structure
      const structure = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'event_upvotes'
        ORDER BY ordinal_position;
      `);

      console.log('Table structure:');
      structure.rows.forEach((row) => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });

      console.log('\nRLS enabled:');
      const rls = await client.query(`
        SELECT rowsecurity FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'event_upvotes';
      `);
      console.log(`  RLS: ${rls.rows[0]?.rowsecurity ? '✅ On' : '❌ Off'}`);

      console.log('\nPolicies:');
      const policies = await client.query(`
        SELECT policyname, cmd FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'event_upvotes';
      `);

      if (policies.rows.length === 0) {
        console.log('  ❌ No policies found');
      } else {
        policies.rows.forEach((row) => {
          console.log(`  - ${row.policyname} (${row.cmd})`);
        });
      }

      // Try a simple SELECT
      console.log('\nTesting SELECT...');
      const selectTest = await client.query('SELECT COUNT(*) FROM public.event_upvotes;');
      console.log(`  ✅ SELECT works. Row count: ${selectTest.rows[0].count}`);

      console.log('\n✅ Table is fully functional on database level!');
    }

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err?.message);
    await client.end();
  }
}

checkTable();
