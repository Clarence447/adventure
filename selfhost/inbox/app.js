const $ = id => document.getElementById(id);
let offset = 0;
function message(text) { $('message').textContent = text; }
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (response.status === 401) { $('inbox').hidden = true; $('login').hidden = false; $('list').replaceChildren(); }
  if (!response.ok) throw new Error(result.error || 'Request failed');
  return result;
}
function element(tag, text) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; }
async function load() {
  try {
    const result = await api(`/api/enquiries?offset=${offset}`);
    $('login').hidden = true; $('inbox').hidden = false; $('list').replaceChildren();
    $('previous').disabled = offset === 0; $('next').disabled = !result.more;
    message(result.enquiries.length ? 'Newest enquiries first' : 'No enquiries yet. New submissions will appear here.');
    for (const row of result.enquiries) {
      const p = row.payload, card = element('article');
      card.append(element('h2', p.business_name), element('p', `${p.contact_name} · ${row.status} · ${new Date(row.created_at).toLocaleString()}`));
      card.append(element('p', `Email: ${p.email}`), element('p', `Phone: ${p.phone || 'Not supplied'}`));
      const detail = element('details'); detail.append(element('summary', 'Questionnaire and consent'));
      const labels = { business_type:'Business type', inquiries:'Monthly enquiries', missed_calls:'Unanswered calls', response_time:'Response time', follow_up:'Existing follow-up', goal:'Goal' };
      for (const [key, label] of Object.entries(labels)) detail.append(element('p', `${label}: ${p[key] ?? 'Not supplied'}`));
      detail.append(element('p', `Consent recorded: ${row.consent_at} (${row.consent_version})`)); card.append(detail);
      const form = element('form'), label = element('label', 'Status'), select = element('select');
      for (const status of ['New','Contacted','Closed']) { const option = element('option', status); option.selected = status === row.status; select.append(option); }
      label.append(select); const notesLabel = element('label', 'Follow-up notes'), notes = element('textarea'); notes.maxLength = 5000; notes.rows = 4; notes.value = row.notes; notesLabel.append(notes);
      const save = element('button', 'Save changes'), feedback = element('p'); feedback.setAttribute('role','status'); form.append(label,notesLabel,save,feedback);
      form.onsubmit = async event => { event.preventDefault(); save.disabled = true; try { const result = await api('/api/followup', {id:row.submission_id,status:select.value,notes:notes.value,revision:row.revision}); row.revision = result.revision; feedback.textContent = 'Saved'; } catch (error) { feedback.textContent = error.message; } finally { save.disabled = false; } };
      card.append(form); $('list').append(card);
    }
  } catch (error) { message(error.message); }
}
$('login').onsubmit = async event => { event.preventDefault(); const button = $('login').querySelector('button'); button.disabled = true; try { await api('/api/login',{password:$('password').value}); $('password').value = ''; offset = 0; await load(); } catch(error) { message(error.message); } finally { button.disabled = false; } };
$('logout').onclick = async () => { try { await api('/api/logout',{}); $('list').replaceChildren(); $('inbox').hidden = true; $('login').hidden = false; message('Signed out'); } catch(error) { message(error.message); } };
$('refresh').onclick = load;
$('previous').onclick = () => { offset = Math.max(0,offset-50); load(); };
$('next').onclick = () => { offset += 50; load(); };
load();
