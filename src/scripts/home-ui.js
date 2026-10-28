const notes = ['A small idea is still an idea.', 'Write it down. It might grow.', 'To be continued…'];
const blog = document.getElementById('blog-card');
const note = document.getElementById('paper-note');
const flip = document.getElementById('flip-note');
let index = -1;
flip?.addEventListener('click', () => {
  index = (index + 1) % (notes.length + 1);
  const hasNote = index < notes.length;
  blog.classList.toggle('has-note', hasNote);
  if (hasNote) note.textContent = notes[index];
  blog.querySelector('.toy-status').textContent = hasNote ? notes[index] : 'A blank page.';
});
if (flip) flip.hidden = false;

const work = document.getElementById('work-card');
const run = document.getElementById('run-code');
run?.addEventListener('click', () => {
  const running = work.classList.toggle('running');
  const label = running ? 'Reset the code' : 'Run the code';
  run.setAttribute('aria-label', label);
  run.setAttribute('aria-pressed', String(running));
  work.querySelector('.toy-tip').textContent = label;
  work.querySelector('.toy-status').textContent = running ? 'Code output: desserts.' : 'Code output reset.';
});
if (run) run.hidden = false;