import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const file = path.resolve(process.cwd(), 'data', 'users.json');

async function main() {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const users = JSON.parse(raw);
    let changed = 0;
    for (const u of users) {
      if (u.password && typeof u.password === 'string' && !u.password.startsWith('$2')) {
        u.password = bcrypt.hashSync(u.password, 10);
        changed++;
      }
    }
    await fs.writeFile(file, JSON.stringify(users, null, 2), 'utf8');
    console.log(`Updated ${changed} user(s) in ${file}`);
  } catch (err) {
    console.error('Failed to update users.json', err);
    process.exit(1);
  }
}

main();
