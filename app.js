const params = new URLSearchParams(window.location.search);
const isTableMode = params.get('mode') === 'table';
const stateKey = `ranking-check:${params.get('table') || '1'}`;

const hostScenes = [...document.querySelectorAll('.scene')];
const indicator = document.querySelector('#scene-indicator');
const hostQuestionNumber = document.querySelector('#host-question-number');
const hostQuestionTitle = document.querySelector('#host-question-title');
const hostChoices = document.querySelector('#host-choices');
const hostAnswerLetter = document.querySelector('#host-answer-letter');
const hostPassphrase = document.querySelector('#host-passphrase');
const hostRevealNext = document.querySelector('#host-reveal-next');
const hostRevealScene = document.querySelector('[data-scene="reveal"]');
const hostFinalMessage = document.querySelector('#host-final-message');
const hostFinalPassphrase = document.querySelector('#host-final-passphrase');

const tableClient = document.querySelector('#table-client');
const tableGame = document.querySelector('#table-game');
const tableName = document.querySelector('#table-name');
const tableEntry = document.querySelector('#table-entry');
const entryPassphrase = document.querySelector('#entry-passphrase');
const entryStatus = document.querySelector('#entry-status');
const entrySubmit = document.querySelector('#entry-submit');
const tableQuestionCount = document.querySelector('#table-question-count');
const tableQuestionTitle = document.querySelector('#table-question-title');
const tableCopy = document.querySelector('#table-copy');
const tableChoices = document.querySelector('#table-choices');
const tableQuestionContent = document.querySelector('#table-question-content');
const tableStatus = document.querySelector('#table-status');
const tableConfirm = document.querySelector('#table-confirm');
const tableComplete = document.querySelector('#table-complete');
const tableSelectedRoom = document.querySelector('#table-selected-room');
const tableResultDisplay = document.querySelector('#table-result-display');
const tableRankImage = document.querySelector('#table-rank-image');
const resultTableNumber = document.querySelector('#result-table-number');
const resultComment = document.querySelector('#result-comment');
const resultClosingMessage = document.querySelector('#result-closing-message');
const passphrase = document.querySelector('#passphrase');
const passphraseStatus = document.querySelector('#passphrase-status');
const tableNext = document.querySelector('#table-next');

let game;
let hostQuestionIndex = 0;
let hostSceneIndex = 0;
let selectedTableChoice = null;
let tableState = { questionIndex: 0, answers: {} };

function loadTableState() {
  try {
    const saved = JSON.parse(localStorage.getItem(stateKey));
    if (saved && Number.isInteger(saved.questionIndex) && saved.answers) tableState = saved;
  } catch {
    // A private browser mode may reject storage; the game still works for this session.
  }
}

function saveTableState() {
  try { localStorage.setItem(stateKey, JSON.stringify(tableState)); } catch { /* See loadTableState. */ }
}

function currentQuestion(index) {
  return game.questions[index];
}

function choiceById(question, id) {
  return question.choices.find((choice) => choice.id === id);
}

function choiceClass(index) {
  return ['a', 'b', 'c'][index] || 'a';
}

function setHostQuestion() {
  const question = currentQuestion(hostQuestionIndex);
  hostQuestionNumber.textContent = `第 ${hostQuestionIndex + 1} 問`;
  hostQuestionTitle.textContent = question.title;
  hostChoices.style.setProperty('--choice-count', question.choices.length);
  hostChoices.replaceChildren(...question.choices.map((choice, index) => {
    const item = document.createElement('div');
    item.className = `choice choice-${choiceClass(index)}`;
    item.innerHTML = `<img class="room-choice-image" src="${choice.image}" alt="選択肢 ${choice.id}" />`;
    return item;
  }));
  hostAnswerLetter.textContent = question.answer;
  hostPassphrase.textContent = question.passphrase;
  hostRevealScene.style.setProperty('--reveal-image', `url("${choiceById(question, question.answer).image}")`);
  hostRevealNext.textContent = hostQuestionIndex === game.questions.length - 1 ? '最終結果へ' : '次の問題へ';
}

function showHostScene(index) {
  hostSceneIndex = Math.max(0, Math.min(index, hostScenes.length - 1));
  hostScenes.forEach((scene, sceneIndex) => scene.classList.toggle('is-active', sceneIndex === hostSceneIndex));
  indicator.textContent = ['OPENING', 'RANKS', `QUESTION ${String(hostQuestionIndex + 1).padStart(2, '0')}`, 'ANSWER', 'RESULT'][hostSceneIndex];
}

function getResult(correct) {
  const total = game.questions.length;
  return game.results.find((item) => {
    if (item.rule === 'allCorrect') return correct === total;
    if (item.rule === 'oneMiss') return correct === total - 1;
    if (item.rule === 'atMostOneThird') return correct / total <= 1 / 3;
    return item.rule === 'default';
  });
}

function showHostResult() {
  hostFinalMessage.textContent = game.finalResultMessage;
  hostFinalPassphrase.textContent = game.finalResultPassphrase;
  showHostScene(4);
}

function moveHostBack() {
  if (hostSceneIndex === 0) return;
  if (hostSceneIndex === 4) {
    showHostScene(3);
    return;
  }
  if (hostSceneIndex === 3) {
    showHostScene(2);
    return;
  }
  if (hostSceneIndex === 1) {
    showHostScene(0);
    return;
  }
  if (hostQuestionIndex === 0) {
    showHostScene(1);
    return;
  }
  hostQuestionIndex -= 1;
  setHostQuestion();
  showHostScene(3);
}

function renderTableChoices(question, lockedAnswer) {
  tableChoices.hidden = false;
  tableChoices.style.setProperty('--choice-count', question.choices.length);
  tableChoices.replaceChildren(...question.choices.map((choice, index) => {
    const button = document.createElement('button');
    const isSelected = choice.id === (lockedAnswer || selectedTableChoice);
    button.className = `table-choice is-${choiceClass(index)}${isSelected ? ' is-selected' : ''}`;
    button.disabled = Boolean(lockedAnswer);
    button.dataset.tableChoice = choice.id;
    button.setAttribute('aria-label', `選択肢 ${choice.id}`);
    button.innerHTML = `<img class="room-choice-image" src="${choice.image}" alt="" />`;
    button.addEventListener('click', () => chooseTableAnswer(choice.id));
    return button;
  }));
}

function renderTableQuestion() {
  if (tableState.questionIndex >= game.questions.length) return renderTableResult();
  const question = currentQuestion(tableState.questionIndex);
  const lockedAnswer = tableState.answers[tableState.questionIndex];
  selectedTableChoice = null;
  tableGame.classList.remove('is-result');
  tableResultDisplay.hidden = true;
  tableQuestionCount.textContent = `QUESTION ${String(tableState.questionIndex + 1).padStart(2, '0')}`;
  tableQuestionTitle.textContent = question.title;
  tableCopy.hidden = false;
  renderTableChoices(question, lockedAnswer);
  tableQuestionContent.hidden = Boolean(lockedAnswer);
  tableGame.classList.toggle('is-waiting', Boolean(lockedAnswer));
  tableConfirm.hidden = Boolean(lockedAnswer);
  tableComplete.hidden = !lockedAnswer;
  passphrase.parentElement.hidden = false;
  tableNext.hidden = false;
  const isFinalQuestion = tableState.questionIndex === game.questions.length - 1;
  tableNext.textContent = isFinalQuestion ? '結果発表' : '次の問題へ';
  tableNext.classList.toggle('is-final', isFinalQuestion);
  passphrase.value = '';
  passphraseStatus.textContent = '';
  tableNext.disabled = true;
  if (lockedAnswer) {
    const choice = choiceById(question, lockedAnswer);
    tableSelectedRoom.src = choice.image;
    tableSelectedRoom.alt = `${choice.id}を選択`;
    tableGame.style.setProperty('--waiting-image', `url("${choice.mobileImage}")`);
  } else {
    tableStatus.textContent = 'まだ回答していません';
    tableConfirm.disabled = true;
  }
}

function renderTableResult() {
  const correct = Object.entries(tableState.answers).filter(([index, answer]) => game.questions[index].answer === answer).length;
  const result = getResult(correct);
  tableQuestionContent.hidden = true;
  tableGame.classList.remove('is-waiting');
  tableGame.classList.add('is-result');
  tableConfirm.hidden = true;
  tableComplete.hidden = true;
  tableRankImage.src = result.image;
  tableRankImage.alt = result.title;
  tableGame.style.setProperty('--result-image', `url("${result.image}")`);
  resultTableNumber.textContent = `${params.get('table') || '1'} 卓`;
  resultComment.textContent = result.description;
  resultClosingMessage.textContent = game.closingMessage;
  tableResultDisplay.hidden = false;
}

function chooseTableAnswer(answer) {
  if (tableState.answers[tableState.questionIndex]) return;
  selectedTableChoice = answer;
  renderTableChoices(currentQuestion(tableState.questionIndex));
  tableConfirm.disabled = false;
  tableStatus.textContent = `${answer} を選択中です`;
}

function confirmTableAnswer() {
  if (!selectedTableChoice) return;
  tableState.answers[tableState.questionIndex] = selectedTableChoice;
  saveTableState();
  renderTableQuestion();
}

function moveTableNext() {
  const question = currentQuestion(tableState.questionIndex);
  const expectedPassphrase = tableState.questionIndex === game.questions.length - 1
    ? game.finalResultPassphrase
    : question.passphrase;
  if (passphrase.value.trim() !== expectedPassphrase) {
    passphraseStatus.textContent = '合言葉が違います。会場スクリーンを確認してください。';
    return;
  }
  tableState.questionIndex += 1;
  saveTableState();
  renderTableQuestion();
}

function startHost() {
  setHostQuestion();
  showHostScene(0);
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'restart') {
      hostQuestionIndex = 0;
      setHostQuestion();
      showHostScene(0);
    }
    if (action === 'previous') moveHostBack();
    if (action === 'next') {
      if (hostSceneIndex === 3 && hostQuestionIndex < game.questions.length - 1) {
        hostQuestionIndex += 1;
        setHostQuestion();
        showHostScene(2);
      } else if (hostSceneIndex === 3) {
        showHostResult();
      } else {
        showHostScene(hostSceneIndex + 1);
      }
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === ' ') document.querySelector('.operator-bar [data-action="next"]').click();
    if (event.key === 'ArrowLeft') moveHostBack();
  });
}

function startTable() {
  const table = `${params.get('table') || '1'} 卓`;
  tableName.textContent = table;
  tableClient.classList.add('is-active');
  loadTableState();
  tableConfirm.addEventListener('click', confirmTableAnswer);
  passphrase.addEventListener('input', () => {
    const expectedPassphrase = tableState.questionIndex === game.questions.length - 1
      ? game.finalResultPassphrase
      : currentQuestion(tableState.questionIndex).passphrase;
    tableNext.disabled = passphrase.value.trim() !== expectedPassphrase;
  });
  tableNext.addEventListener('click', moveTableNext);
  entryPassphrase.addEventListener('input', () => {
    entrySubmit.disabled = entryPassphrase.value.trim() !== game.entryPassphrase;
    entryStatus.textContent = '';
  });
  entrySubmit.addEventListener('click', () => {
    if (entryPassphrase.value.trim() !== game.entryPassphrase) {
      entryStatus.textContent = '合言葉が違います。司会に確認してください。';
      return;
    }
    tableEntry.hidden = true;
    tableGame.hidden = false;
    renderTableQuestion();
  });
}

fetch('questions.json')
  .then((response) => response.ok ? response.json() : Promise.reject(new Error('questions.json could not be loaded')))
  .then((data) => {
    game = data;
    document.title = game.title;
    isTableMode ? startTable() : startHost();
  })
  .catch(() => {
    document.body.textContent = '問題データを読み込めませんでした。ローカルサーバーから開いてください。';
  });
