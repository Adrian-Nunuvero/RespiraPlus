async function runTests() {
  const baseUrl = 'http://localhost:4000/api';

  console.log('--- TEST 1: GET /api/auth/me without token ---');
  const res1 = await fetch(`${baseUrl}/auth/me`);
  console.log('Status:', res1.status, await res1.json());

  console.log('\n--- TEST 2: Login as Patient (Carlos Vega) ---');
  const resLoginPatient = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'carlos.vega@hospital.med', password: '12345678' })
  });
  const patientData = await resLoginPatient.json();
  console.log('Patient login status:', resLoginPatient.status, 'Role:', patientData.user.role, 'Token:', patientData.token);

  console.log('\n--- TEST 3: Patient tries to access /api/admin/stats (Should be 403 Forbidden) ---');
  const resAdminAsPatient = await fetch(`${baseUrl}/admin/stats`, {
    headers: { 'Authorization': `Bearer ${patientData.token}` }
  });
  console.log('Status:', resAdminAsPatient.status, await resAdminAsPatient.json());

  console.log('\n--- TEST 4: Login as Doctor/Admin (Dr. Roberto Martínez) ---');
  const resLoginDoctor = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'doctor@hospital.med', password: 'admin123' })
  });
  const doctorData = await resLoginDoctor.json();
  console.log('Doctor login status:', resLoginDoctor.status, 'Role:', doctorData.user.role, 'Token:', doctorData.token);

  console.log('\n--- TEST 5: Doctor accesses /api/admin/stats (Should be 200 OK) ---');
  const resAdminAsDoctor = await fetch(`${baseUrl}/admin/stats`, {
    headers: { 'Authorization': `Bearer ${doctorData.token}` }
  });
  console.log('Status:', resAdminAsDoctor.status, await resAdminAsDoctor.json());

  console.log('\n--- TEST 6: Session validation /api/auth/me with Doctor token ---');
  const resMeDoctor = await fetch(`${baseUrl}/auth/me`, {
    headers: { 'Authorization': `Bearer ${doctorData.token}` }
  });
  console.log('Status:', resMeDoctor.status, await resMeDoctor.json());
}

runTests().catch(console.error);
