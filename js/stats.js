/* ===================================================
   HUELLAS UNIDAS — Dashboard de estadísticas
=================================================== */
async function initStatsPage(){
  const pets = await API.getPets();
  const lost = pets.filter(p=>p.kind==='perdida');
  const found = pets.filter(p=>p.kind==='encontrada');
  const reunited = pets.filter(p=>p.status==='reunida');
  const adopted = pets.filter(p=>p.kind==='adopcion');

  document.getElementById('cardLost').textContent = lost.length;
  document.getElementById('cardFound').textContent = found.length;
  document.getElementById('cardReunited').textContent = reunited.length;
  document.getElementById('cardAdopt').textContent = adopted.length;

  const totalCases = lost.length;
  const reunionRate = totalCases ? Math.round((reunited.length/totalCases)*100) : 0;
  document.getElementById('reunionRate').textContent = reunionRate + '%';

  // Tiempo promedio de búsqueda (días) para casos reunidos
  const searchTimes = reunited.filter(p=>p.reunitedAt && p.createdAt).map(p=>(p.reunitedAt-p.createdAt)/(1000*60*60*24));
  const avgSearch = searchTimes.length ? (searchTimes.reduce((a,b)=>a+b,0)/searchTimes.length).toFixed(1) : '—';
  document.getElementById('avgSearchTime').textContent = avgSearch + (searchTimes.length? ' días':'');

  // Distritos con más reportes
  const byDistrict = {};
  pets.forEach(p=>{ if (p.district) byDistrict[p.district] = (byDistrict[p.district]||0)+1; });
  const topDistricts = Object.entries(byDistrict).sort((a,b)=>b[1]-a[1]).slice(0,6);
  document.getElementById('districtRanking').innerHTML = topDistricts.length
    ? topDistricts.map(([d,c])=>`<li><span>${d}</span><strong>${c}</strong></li>`).join('')
    : '<li><span>Sin datos aún</span></li>';

  // Gráfico: Perdidas vs Encontradas vs Adopción (dona)
  new Chart(document.getElementById('chartTypes'), {
    type:'doughnut',
    data:{
      labels:['Perdidas','Encontradas','En adopción','Reunidas'],
      datasets:[{ data:[lost.length, found.length, adopted.length, reunited.length],
        backgroundColor:['#E25563','#2D9596','#8B6FD1','#3BA776'] }]
    },
    options:{ plugins:{legend:{position:'bottom'}} }
  });

  // Gráfico: reportes por mes (línea)
  const byMonth = {};
  pets.forEach(p=>{
    const d = new Date(p.createdAt);
    const key = d.toLocaleDateString('es-PE', { month:'short', year:'2-digit' });
    byMonth[key] = (byMonth[key]||0)+1;
  });
  const monthEntries = Object.entries(byMonth);
  new Chart(document.getElementById('chartTimeline'), {
    type:'line',
    data:{
      labels: monthEntries.map(e=>e[0]),
      datasets:[{ label:'Reportes', data: monthEntries.map(e=>e[1]), borderColor:'#FF7A45', backgroundColor:'rgba(255,122,69,.15)', fill:true, tension:.35 }]
    },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true, ticks:{stepSize:1} } } }
  });

  // Gráfico: especies más reportadas (barras)
  const bySpecies = {};
  pets.forEach(p=>{ if (p.species) bySpecies[p.species] = (bySpecies[p.species]||0)+1; });
  new Chart(document.getElementById('chartSpecies'), {
    type:'bar',
    data:{
      labels: Object.keys(bySpecies),
      datasets:[{ label:'Reportes', data: Object.values(bySpecies), backgroundColor:'#2D9596', borderRadius:8 }]
    },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true, ticks:{stepSize:1} } } }
  });
}
