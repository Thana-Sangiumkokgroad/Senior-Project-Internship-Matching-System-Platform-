const bcrypt = require('bcrypt');

const passwords = [
  { user: 'student1', password: 'student123' },
  { user: 'student2', password: 'student123' },
  { user: 'student3', password: 'student123' },
  { user: 'company1', password: 'company123' },
  { user: 'company2', password: 'company123' },
  { user: 'company3', password: 'company123' },
  { user: 'supervisor1', password: 'super123' },
  { user: 'supervisor2', password: 'super123' },
  { user: 'admin', password: 'admin123' }
];

async function generateHashes() {
  for (const item of passwords) {
    const hash = await bcrypt.hash(item.password, 10);
    console.log(`${item.user}: ${hash}`);
  }
}

generateHashes();
