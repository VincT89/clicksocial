import { fail } from './store.mjs';
export function instant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) fail(400, 'Data non valida.');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) fail(400, 'Data non valida.');
  return value;
}
export function editablePost(data) {
  if (data.status === 'da_verificare') fail(409, 'Verifica prima l’esito dell’invio sul social dalla Libreria.');
  if (['in_coda', 'in_pubblicazione'].includes(data.status)) fail(409, 'Annulla prima l’invio automatico. Se è già in corso, attendi il completamento.');
  if (data.status === 'pubblicato') fail(409, 'Il post è già pubblicato e rimane in sola lettura.');
}
export function planPost(data, body) {
  editablePost(data);
  if (Object.keys(body).some(key => !['editorial_at', 'editorial_notes'].includes(key))) fail(400, 'Campi del piano editoriale non validi.');
  if ('editorial_at' in body) data.editorial_at = body.editorial_at === null ? null : instant(body.editorial_at);
  if ('editorial_notes' in body) {
    if (typeof body.editorial_notes !== 'string' || body.editorial_notes.length > 5000) fail(400, 'Le note possono contenere al massimo 5000 caratteri.');
    data.editorial_notes = body.editorial_notes.trim();
  }
  return data;
}
export function cancelSchedule(data) {
  if (data.status !== 'in_coda') fail(409, 'Il post non è in coda oppure la pubblicazione è già iniziata. Aggiorna il calendario.');
  data.status = 'pronto';
  delete data.scheduled_at; delete data.social_page_id; delete data.schedule_error; delete data.social_job;
  return data;
}

