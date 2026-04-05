// scripts/migrate-nessty.ts
/**
 * Script para importar usuarios desde un CSV exportado de Nessty.
 *
 * Uso:
 *   1. Exportar usuarios de Nessty como CSV
 *   2. El CSV debe tener columnas: nombre, email, telefono (o phone)
 *   3. Ejecutar: npx ts-node scripts/migrate-nessty.ts ruta/al/archivo.csv
 *
 * El script:
 *   - Crea la cuenta en Supabase Auth con password temporal
 *   - Crea el perfil en public.users con fuente='migracion_nessty'
 *   - Omite usuarios cuyo email ya existe
 *   - Genera un reporte final de resultados
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface NesstyRow {
  nombre: string;
  email: string;
  telefono?: string;
}

function parseCSV(filePath: string): Promise<NesstyRow[]> {
  return new Promise((resolve, reject) => {
    const rows: NesstyRow[] = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    let headers: string[] = [];
    let isFirst = true;

    rl.on('line', (line) => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

      if (isFirst) {
        headers = values.map(h => h.toLowerCase());
        isFirst = false;
        return;
      }

      if (values.length < 2) return;

      const nombreIdx = headers.findIndex(h => h.includes('nombre') || h === 'name');
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const telIdx = headers.findIndex(h => h.includes('tel') || h.includes('phone') || h.includes('cel'));

      if (nombreIdx === -1 || emailIdx === -1) return;

      const email = values[emailIdx]?.toLowerCase().trim();
      const nombre = values[nombreIdx]?.trim();

      if (!email || !nombre) return;

      rows.push({
        nombre,
        email,
        telefono: telIdx >= 0 ? values[telIdx]?.trim() : undefined,
      });
    });

    rl.on('close', () => resolve(rows));
    rl.on('error', reject);
  });
}

async function migrateUser(row: NesstyRow): Promise<'created' | 'skipped' | 'error'> {
  // Verificar si ya existe en public.users
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', row.email)
    .single();

  if (existing) return 'skipped';

  // Generar password temporal seguro (el usuario la cambiará con primer-acceso)
  const tempPassword = `Nessty_${Math.random().toString(36).slice(2, 10)}!`;

  // Crear cuenta en Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: row.email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already registered')) return 'skipped';
    console.error(`  ✗ Auth error para ${row.email}: ${authError.message}`);
    return 'error';
  }

  // Crear perfil en public.users
  const { error: profileError } = await supabaseAdmin.from('users').insert({
    auth_id: authData.user.id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono,
    rol: 'user',
    fuente: 'migracion_nessty',
  });

  if (profileError) {
    // Rollback
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    console.error(`  ✗ Profile error para ${row.email}: ${profileError.message}`);
    return 'error';
  }

  return 'created';
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('Uso: npx ts-node scripts/migrate-nessty.ts ruta/al/archivo.csv');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`Archivo no encontrado: ${csvPath}`);
    process.exit(1);
  }

  console.log(`\n📋 Leyendo CSV: ${csvPath}`);
  const rows = await parseCSV(csvPath);
  console.log(`   ${rows.length} filas encontradas\n`);

  const results = { created: 0, skipped: 0, error: 0 };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[${i + 1}/${rows.length}] Procesando ${row.email}... `);

    const result = await migrateUser(row);
    results[result]++;
    console.log(result === 'created' ? '✓ Creada' : result === 'skipped' ? '→ Ya existe' : '✗ Error');

    // Pequeña pausa para no saturar Supabase
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n═══════════════════════════════');
  console.log('Migración completada:');
  console.log(`  ✓ Creadas:  ${results.created}`);
  console.log(`  → Omitidas: ${results.skipped}`);
  console.log(`  ✗ Errores:  ${results.error}`);
  console.log('═══════════════════════════════\n');
}

main().catch(console.error);
