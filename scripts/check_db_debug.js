const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Using URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const { data: years } = await supabase.from('academic_years').select('*');
  console.log('Years in DB:', years?.length || 0);
  console.log('Years:', JSON.stringify(years));

  const { count: classesCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
  console.log('Classes in DB:', classesCount);

  const { data: sampleClasses } = await supabase.from('classes').select('id, name, grade').limit(5);
  console.log('Sample classes:', JSON.stringify(sampleClasses));

  const { count: studentsCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
  console.log('Students in DB:', studentsCount);

  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
