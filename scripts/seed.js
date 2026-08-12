require('./_env').loadEnv();
const bcrypt = require('bcryptjs');
const { Pool } = require('@neondatabase/serverless');

async function main(){
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try{
    const { rows: existing } = await pool.query('SELECT count(*)::int AS n FROM users');
    if (existing[0].n > 0){
      console.log('Ya hay datos en la base (users > 0). No se vuelve a sembrar. Borra las tablas si quieres re-sembrar.');
      return;
    }

    const users = [
      { key:'admin', name:'Administrador HU', email:'admin@huellasunidas.pe', phone:'999000111', password:'admin123', role:'admin', verified:true },
      { key:'maria', name:'María Fernández', email:'maria@demo.pe', phone:'987654321', password:'demo123', role:'user', verified:true },
      { key:'jose',  name:'José Ramírez',    email:'jose@demo.pe',  phone:'956123456', password:'demo123', role:'user', verified:true },
      { key:'lucia', name:'Lucía Torres',    email:'lucia@demo.pe', phone:'945678123', password:'demo123', role:'user', verified:false },
    ];

    const ids = {};
    for (const u of users){
      const hash = await bcrypt.hash(u.password, 10);
      const { rows } = await pool.query(
        `INSERT INTO users (name, email, phone, password_hash, role, verified)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [u.name, u.email, u.phone, hash, u.role, u.verified]
      );
      ids[u.key] = rows[0].id;
    }
    console.log(`Usuarios sembrados: ${users.length}`);

    const now = Date.now();
    const day = 1000*60*60*24;
    const isoDate = (ms) => new Date(ms).toISOString().slice(0,10);

    const pets = [
      { kind:'perdida', status:'perdida', name:'Toby', species:'Perro', breed:'Mestizo (Beagle)',
        sex:'Macho', age:'3 años', size:'Mediano', color:'Marrón y blanco',
        features:'Cicatriz pequeña en la oreja izquierda, muy juguetón', microchip:false, collar:true,
        health:'Saludable', reward:'S/ 200', photos:[],
        date: isoDate(now-day*2), time:'18:30',
        address:'Av. Larco 345', district:'Miraflores', province:'Lima', department:'Lima',
        lat:-12.1211, lng:-77.0297, description:'Se escapó por la puerta principal mientras jugaba en el jardín. Última vez visto corriendo hacia el parque Kennedy.',
        ownerKey:'maria' },
      { kind:'perdida', status:'perdida', name:'Misha', species:'Gato', breed:'Siamés',
        sex:'Hembra', age:'1 año', size:'Pequeño', color:'Crema con puntos oscuros',
        features:'Ojos azules, collar rosado con cascabel', microchip:true, collar:true,
        health:'Saludable', reward:'S/ 100', photos:[],
        date: isoDate(now-day*5), time:'09:00',
        address:'Calle Las Begonias 120', district:'San Isidro', province:'Lima', department:'Lima',
        lat:-12.0972, lng:-77.0349, description:'Salió por la ventana del segundo piso. Es muy asustadiza con los desconocidos.',
        ownerKey:'jose' },
      { kind:'encontrada', status:'verificacion', name:'(Sin nombre)', species:'Perro', breed:'Mestizo (Beagle)',
        sex:'Macho', age:'Aprox. 3 años', size:'Mediano', color:'Marrón y blanco',
        features:'Tiene collar pero sin placa, parece entrenado', microchip:false, collar:true,
        health:'Buen estado, algo asustado', reward:'', photos:[],
        date: isoDate(now-day*1), time:'20:10',
        address:'Parque Kennedy', district:'Miraflores', province:'Lima', department:'Lima',
        lat:-12.1219, lng:-77.0282, description:'Lo encontré cerca al parque Kennedy, deambulando solo. Lo tengo en casa mientras se ubica a su dueño.',
        ownerKey:'lucia' },
      { kind:'perdida', status:'perdida', name:'Rocky', species:'Perro', breed:'Pastor Alemán',
        sex:'Macho', age:'5 años', size:'Grande', color:'Negro y café',
        features:'Cojea ligeramente de la pata trasera derecha', microchip:true, collar:true,
        health:'Saludable', reward:'S/ 300', photos:[],
        date: isoDate(now-day*8), time:'07:15',
        address:'Av. Pardo 900', district:'Surco', province:'Lima', department:'Lima',
        lat:-12.1450, lng:-76.9930, description:'Se perdió durante un paseo nocturno, se asustó con fuegos artificiales.',
        ownerKey:'maria' },
      { kind:'encontrada', status:'encontrada', name:'(Sin nombre)', species:'Gato', breed:'Siamés',
        sex:'Hembra', age:'Aprox. 1 año', size:'Pequeño', color:'Crema con puntos oscuros',
        features:'Collar rosado con cascabel, muy mansa', microchip:false, collar:true,
        health:'Saludable', reward:'', photos:[],
        date: isoDate(now-day*4), time:'14:20',
        address:'Calle Choquehuanca 200', district:'San Isidro', province:'Lima', department:'Lima',
        lat:-12.1005, lng:-77.0330, description:'Apareció en el jardín de mi casa, muy cariñosa. Creo que busca a su familia.',
        ownerKey:'jose' },
      { kind:'adopcion', status:'adopcion', name:'Luna', species:'Perro', breed:'Mestiza',
        sex:'Hembra', age:'2 años', size:'Mediano', color:'Negro',
        features:'Esterilizada, vacunas completas, muy sociable con niños', microchip:false, collar:false,
        health:'Excelente', reward:'', photos:[], vaccines:true, sterilized:true,
        story:'Luna fue rescatada de la calle hace 6 meses. Es muy juguetona, le encanta pasear y se adapta bien a otros animales.',
        requirements:'Casa con espacio, compromiso de esterilización si no lo está, visita de seguimiento.',
        date: isoDate(now-day*20), time:'',
        address:'Refugio Patitas Felices', district:'La Molina', province:'Lima', department:'Lima',
        lat:-12.0850, lng:-76.9460, description:'Disponible para adopción responsable.',
        ownerKey:'lucia' },
      { kind:'adopcion', status:'adopcion', name:'Simón', species:'Gato', breed:'Mestizo',
        sex:'Macho', age:'8 meses', size:'Pequeño', color:'Gris atigrado',
        features:'Esterilizado, desparasitado, muy independiente', microchip:false, collar:false,
        health:'Excelente', reward:'', photos:[], vaccines:true, sterilized:true,
        story:'Simón llegó como parte de una camada rescatada. Es curioso y le gusta dormir al sol.',
        requirements:'Hogar tranquilo, preferible sin perros grandes.',
        date: isoDate(now-day*15), time:'',
        address:'Refugio Patitas Felices', district:'La Molina', province:'Lima', department:'Lima',
        lat:-12.0880, lng:-76.9500, description:'Disponible para adopción responsable.',
        ownerKey:'admin' },
      { kind:'perdida', status:'reunida', name:'Coco', species:'Perro', breed:'Caniche',
        sex:'Macho', age:'4 años', size:'Pequeño', color:'Blanco',
        features:'Muy ruidoso, ladra mucho', microchip:false, collar:true,
        health:'Saludable', reward:'', photos:[],
        date: isoDate(now-day*30), time:'11:00',
        address:'Jr. Tacna 220', district:'Barranco', province:'Lima', department:'Lima',
        lat:-12.1490, lng:-77.0210, description:'Reunido con su familia gracias a un vecino que lo reconoció en la plataforma.',
        ownerKey:'jose', reunitedAt: new Date(now-day*27) },
    ];

    const petIds = [];
    for (const p of pets){
      const { rows } = await pool.query(
        `INSERT INTO pets (kind,status,name,species,breed,sex,age,size,color,features,microchip,collar,
           health,reward,photos,date,time,address,district,province,department,lat,lng,description,
           owner_id,vaccines,sterilized,story,requirements,reunited_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
         RETURNING id`,
        [p.kind,p.status,p.name,p.species,p.breed,p.sex,p.age,p.size,p.color,p.features,p.microchip,p.collar,
         p.health,p.reward,p.photos,p.date,p.time,p.address,p.district,p.province,p.department,p.lat,p.lng,p.description,
         ids[p.ownerKey], !!p.vaccines, !!p.sterilized, p.story||null, p.requirements||null, p.reunitedAt||null]
      );
      petIds.push({ key:p.name, id:rows[0].id });
    }
    console.log(`Mascotas sembradas: ${pets.length}`);

    const verifPetId = petIds.find(p => p.key === '(Sin nombre)')?.id || petIds[2].id;
    await pool.query(
      `INSERT INTO messages (pet_id, from_id, to_id, text) VALUES
       ($1,$2,$3,$4), ($1,$3,$2,$5)`,
      [verifPetId, ids.maria, ids.lucia,
       '¡Hola! Creo que ese podría ser Toby, mi perro perdido. ¿Tiene una cicatriz pequeña en la oreja izquierda?',
       '¡Sí! Tiene una marca pequeñita justo ahí. Creo que es él. Está conmigo y muy tranquilo.']
    );
    console.log('Mensajes de ejemplo sembrados.');

    console.log('\nListo. Credenciales demo (mismo password para todas las cuentas demo):');
    console.log('  admin@huellasunidas.pe / admin123 (admin)');
    console.log('  maria@demo.pe / demo123');
    console.log('  jose@demo.pe / demo123');
    console.log('  lucia@demo.pe / demo123');
  } finally {
    await pool.end();
  }
}

main().catch(err => { console.error('Error al sembrar:', err); process.exit(1); });
